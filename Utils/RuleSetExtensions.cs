using LowderDotNet.Props;
using LowderDotNet.Utils;
using Microsoft.EntityFrameworkCore;
using System.Collections;
using System.Linq.Expressions;
using System.Reflection;

namespace LowderDotNet.Utils
{
    public static class RuleSetExtensions
    {
		//public static IQueryable<IGrouping<dynamic, T>> GroupBy2<T>(this IQueryable<T> query, RuleSet rules) where T : class
		//{
		//	IQueryable<IGrouping<dynamic, T>> countQuery = null;
		//	var param = Expression.Parameter(typeof(T));
		//	foreach (GroupByRule groupBy in rules.getGroupBys())
		//	{
		//		var prop = Expression.PropertyOrField(param, groupBy.by);
		//		var left = Expression.Convert(prop, typeof(object));
		//		var expression = Expression.Lambda<Func<T, dynamic>>(left, param);
		//		if (countQuery != null)
		//			countQuery = query.GroupBy(expression);
		//		else
		//			countQuery = countQuery.GroupBy(expression);
		//	}
		//	return countQuery;
		//}

		public static IQueryable<T> WhereRules<T>(this IQueryable<T> query, RuleSet rules) where T : class
        {
            query = WhereFilters(query, rules.Filter);
			var param = Expression.Parameter(typeof(T));

			var k = 0;
			foreach (var rule in rules.Sort)
			{
                if (string.IsNullOrEmpty(rule.Attribute))
                    continue;

				try
				{
					var prop = Expression.PropertyOrField(param, rule.Attribute);
					var expression = Expression.Lambda(prop, [param]);

					var methodName = k > 0 ?
						rule.Sort == OrderRule.OrderType.Descending ? "ThenByDescending" : "ThenBy" :
						rule.Sort == OrderRule.OrderType.Descending ? "OrderByDescending" : "OrderBy";

					var orderByMethod = typeof(Queryable).GetMethods()
						.Where(method => method.Name == methodName)
						.Where(method => method.GetParameters().Length == 2)
						.Single();
					var genericMethod = orderByMethod.MakeGenericMethod([typeof(T), prop.Type]);
					query = (IQueryable<T>)genericMethod.Invoke(null, [query, expression]);
					k++;
				}
				catch (ArgumentException)
				{
					// Property or Field does not exist
				}
			}

			if (rules.Page is int page && page > 0 && rules.PageSize is int pageSize && pageSize > 0)
				query = query.Skip(pageSize * (page - 1)).Take(pageSize);
			return query;
		}

		public static IQueryable<T> WhereRule<T>(this IQueryable<T> query, FilterRule rule) where T : class
        {
            return WhereFilters(query, [rule]);
		}

		public static IQueryable<T> WhereFilters<T>(this IQueryable<T> query, IList<FilterRule> rules) where T : class
        {
            if (rules == null)
                return query;

			var param = Expression.Parameter(typeof(T));

			var queue = new Queue();
			queue.EnqueueAll(rules);
			while (queue.Count > 0)
			{
				var filter = (FilterRule)queue.Dequeue();
				var expression = getQueryExpression(param, filter);
				if (expression != null)
				{
					var condition = Expression.Lambda<Func<T, bool>>(expression, param);
					query = query.Where(condition);
				}
			}

			return query;
        }

        private static Expression? getQueryExpression(ParameterExpression param, FilterRule rule)
        {
            if (string.IsNullOrEmpty(rule.Attribute) || rule.Type == null)
                return null;
            if (rule.IgnoreIfEmpty && Parser.IsEmpty(rule.Value))
                return null;

            Expression left, right;
            var value = rule.Value;

            if (rule.Type == FilterRule.FilterType.In || rule.Type == FilterRule.FilterType.NotIn)
            {
                ICollection values;
                if (value is ICollection c)
                    values = c;
                else if (value is string str)
                    values = str.Split(',');
                else
                    values = new object[0];

                left = Expression.Constant(values, values.GetType());
                right = Expression.PropertyOrField(param, rule.Attribute);
                Expression expression = Expression.Call(left, typeof(IList).GetMethod("Contains"), right);
                if (rule.Type == FilterRule.FilterType.NotIn)
                    expression = Expression.Not(expression);
                return expression;
            }

            try
            {
                left = Expression.PropertyOrField(param, rule.Attribute);
            }
            catch (ArgumentException)
            {
                return null;
            }

            value = sanitizeValue(value, left.Type);
            right = Expression.Constant(value);

            if (value != null)
            {
                if (Nullable.GetUnderlyingType(left.Type) != null)
                {
                    left = Expression.PropertyOrField(left, "Value");
                    //right = Expression.Convert(right, value.GetType());
                }
                else if (value.GetType() != left.Type)
                    right = Expression.Convert(right, left.Type);
            }

            switch (rule.Type)
            {
                case FilterRule.FilterType.Equal:
                    return Expression.Equal(left, right);
                case FilterRule.FilterType.NotEqual:
                    return Expression.NotEqual(left, right);
                case FilterRule.FilterType.Greater:
                    return Expression.GreaterThan(left, right);
                case FilterRule.FilterType.GreaterOrEqual:
                    return Expression.GreaterThanOrEqual(left, right);
                case FilterRule.FilterType.Less:
                    return Expression.LessThan(left, right);
                case FilterRule.FilterType.LessOrEqual:
                    return Expression.LessThanOrEqual(left, right);
                case FilterRule.FilterType.Like:
					return Expression.Call(left, typeof(string).GetMethod("Contains", types: [typeof(string)]), right);
                case FilterRule.FilterType.NotLike:
                    Expression.Negate(Expression.Call(left, typeof(string).GetMethod("Contains", types: [typeof(string)]), right));
                    break;
                case FilterRule.FilterType.StartsWith:
                    return Expression.Call(left, typeof(string).GetMethod("StartsWith", [typeof(string)]), right);
                case FilterRule.FilterType.EndsWith:
					return Expression.Call(left, typeof(string).GetMethod("EndsWith", [typeof(string)]), right);
			}

            return null;
        }

        private static object? sanitizeValue(object? value, Type type)
        {
            if (value == null)
                return null;

            if (type == typeof(DateTime) || type == typeof(DateTime?))
                return Parser.GetDateTime(value);
            if (type == typeof(bool) || type == typeof(bool?))
                return Parser.GetBool(value);
            if (type == typeof(int) || type == typeof(int?))
                return Parser.GetInt(value);
            if (type == typeof(long) || type == typeof(long?))
                return Parser.GetLong(value);
            if (type == typeof(float) || type == typeof(float?))
                return Parser.GetDouble(value);
            if (type == typeof(double) || type == typeof(double?))
                return Parser.GetDouble(value);
            if (type == typeof(decimal) || type == typeof(decimal?))
                return Parser.GetDecimal(value);
            return value;
        }

        public static IQueryable Set(this DbContext context, Type T)
        {
            // Get the generic type definition
            MethodInfo method = typeof(DbContext).GetMethod(nameof(DbContext.Set), BindingFlags.Public | BindingFlags.Instance);

            // Build a method with the specific type argument you're interested in
            method = method.MakeGenericMethod(T);
            return method.Invoke(context, null) as IQueryable;
        }

        //public static IEnumerable<object> FindAll(this DbContext context, Type T, IEnumerable<object> ids)
        //{
        //    // Set the base entity (T) parameter for the lambda and property expressions
        //    var xParameter = Expression.Parameter(T, "a");

        //    // Retrieve the primary key name from the model and set the property expression
        //    var primaryKeyName = context.Model.FindEntityType(T).FindPrimaryKey().Properties.First().Name;
        //    var xId = Expression.Property(xParameter, primaryKeyName);

        //    var idType = xId.Type;

        //    // Set the constant expression with the list of id you want to search for
        //    var xIds = Expression.Constant(ids, typeof(IEnumerable<object>));

        //    // Create the Expression call for the CastEnumerable extension method below 
        //    var xCastEnumerable = Expression.Call(typeof(IEnumerableExtensions), "CastEnumerable", new[] { idType }, xIds);

        //    // Create the expression call for the "Contains" method that will be called on the list
        //    // of id that was cast just above with the id property expression as the parameter
        //    var xContainsMethod = Expression.Call(typeof(Enumerable), "Contains", new[] { idType }, xCastEnumerable, xId);

        //    // Create a lambda expression with the "Contains" expression joined with the base entity (T) parameter
        //    var xWhereLambda = Expression.Lambda(xContainsMethod, xParameter);

        //    // Get the "Queryable.Where" method info
        //    var whereMethodInfo = typeof(Queryable).GetMethods().SingleOrDefault(x => x.Name.Equals("Where") && x.GetParameters()[1].ParameterType.GetGenericTypeDefinition().GenericTypeArguments.Length == 2).MakeGenericMethod(T);

        //    // Call the where method on the DbSet<T> with the lambda expression that compares the list of id with the entity's Id
        //    return whereMethodInfo.Invoke(null, new object[] { context.Set(T), xWhereLambda }) as IEnumerable<object>;
        //}
    }

    //public static class IEnumerableExtensions
    //{
    //    public static IEnumerable<T> CastEnumerable<T>(this IEnumerable<object> sourceEnum)
    //    {
    //        if (sourceEnum == null)
    //            return new List<T>();

    //        try
    //        {
    //            // Covert the objects in the list to the target type (T) 
    //            // (this allows to receive other types and then convert in the desired type)
    //            var convertedEnum = sourceEnum.Select(x => Convert.ChangeType(x, typeof(T)));
    //            // Cast the IEnumerable<object> to IEnumerable<T>
    //            return convertedEnum.Cast<T>();
    //        }
    //        catch (Exception e)
    //        {
    //            throw new InvalidCastException($"There was a problem converting {sourceEnum.GetType()} to {typeof(IEnumerable<T>)}", e);
    //        }
    //    }
    //}
}