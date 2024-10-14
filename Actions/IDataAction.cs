using LowderDotNet.Model;
using LowderDotNet.Props;
using LowderDotNet.Utils;
using Microsoft.EntityFrameworkCore;

namespace LowderDotNet.Actions
{
	public abstract class IDataAction : IStackAction
	{
		protected DbContext? dbContext;
		protected EntitySpec? spec;
		protected object? dbSet;
		protected abstract IProperty<EntitySpec?>? entityProp { get; }

		public sealed override async Task<ActionResult> Execute()
		{
			if (entityProp == null)
				return new ActionResult(false);

			var spec = await entityProp.Build();
			if (spec == null)
				return new ActionResult(false);

			dbContext = (DbContext?)Lowder.GetService(spec.DbContext);
			if (dbContext == null)
				dbContext = (DbContext?)ReflectionUtil.InstantiateClass(spec.DbContext);
			if (dbContext == null)
				return new ActionResult(false);

			dbSet = spec.DbSet.GetValue(dbContext);
			if (dbSet == null)
				return new ActionResult(false);

			this.spec = spec;
			return await internalExecute();
		}

		protected abstract Task<ActionResult> internalExecute();

		protected IQueryable getQuery(RuleSet rules)
		{
			var methodToCall = ReflectionUtil.GetMethod(typeof(RuleSetExtensions), "WhereRules", 2);
			methodToCall = methodToCall.MakeGenericMethod(spec.Entity);
			return (IQueryable)methodToCall.Invoke(dbSet, [dbSet, rules]);
		}

		protected IQueryable getQuery(FilterRule rule)
		{
			var methodToCall = ReflectionUtil.GetMethod(typeof(RuleSetExtensions), "WhereRule", 2);
			methodToCall = methodToCall.MakeGenericMethod(spec.Entity);
			return (IQueryable)methodToCall.Invoke(dbSet, [dbSet, rule]);
		}

		protected IQueryable getQuery(IList<FilterRule> rules)
		{
			var methodToCall = ReflectionUtil.GetMethod(typeof(RuleSetExtensions), "WhereFilters", 2);
			methodToCall = methodToCall.MakeGenericMethod(spec.Entity);
			return (IQueryable)methodToCall.Invoke(dbSet, [dbSet, rules]);
		}
	}

	public class Create : IDataAction
	{
		public IEntity? Entity { get; set; }
		protected override IProperty<EntitySpec?>? entityProp => Entity;

		protected override async Task<ActionResult> internalExecute()
		{
			if (dbContext == null || spec == null || spec.Entry == null || dbSet == null)
				return new ActionResult(false);

			var methodToCall = ReflectionUtil.GetMethod(dbSet.GetType(), "Add", 1);
			methodToCall.Invoke(dbSet, [spec.Entry]);
			dbContext.SaveChanges();
			dbContext.Dispose();
			return new ActionResult(true, returnData: spec.Entry);
		}
	}

	public class Read : IDataAction
	{
		public IEntitySelect? Entity { get; set; }
		public RuleSet? Rules { get; set; }
		protected override IProperty<EntitySpec?>? entityProp => Entity;

		protected override async Task<ActionResult> internalExecute()
		{
			if (dbContext == null || spec == null || dbSet == null)
                return new ActionResult(false);

			var query = dbSet;
            if (Rules is RuleSet rules)
				query = getQuery(rules);

			var methodToCall = ReflectionUtil.GetMethod(typeof(Enumerable), "ToArray", 1);
            methodToCall = methodToCall.MakeGenericMethod(spec.Entity);
            var results = methodToCall.Invoke(query, [query]);
            return new ActionResult(true, returnData: results);
        }
	}

	public class ReadFirst : IDataAction
	{
		public IEntitySelect? Entity { get; set; }
		public string? IdValue { get; set; }
		public RuleSet? Rules { get; set; }
		protected override IProperty<EntitySpec?>? entityProp => Entity;

		protected override async Task<ActionResult> internalExecute()
		{
			var result = getEntry();
			if (result == null)
				return new ActionResult(false);
			return new ActionResult(true, returnData: result);
		}

		protected object? getEntry()
		{
			if (dbContext == null || spec == null || dbSet == null)
				return null;

			var query = dbSet;
			if (!string.IsNullOrEmpty(IdValue))
			{
				var keyName = dbContext.Model
					.FindEntityType(spec.Entity)
					.FindPrimaryKey()
					.Properties.Select(x => x.Name)
					.Single();
				query = getQuery(new FilterRule { Attribute = keyName, Type = FilterRule.FilterType.Equal, Value = IdValue });
			}
			else if (Rules is RuleSet rules)
				query = getQuery(rules);
			else
				return null;

			var methodToCall = ReflectionUtil.GetMethod(typeof(Enumerable), "FirstOrDefault", spec.Entity, 1);
			return methodToCall.Invoke(query, [query]);
		}
	}

	public class Update : ReadFirst
	{
		public new IEntity? Entity { get; set; }
		protected override IProperty<EntitySpec?>? entityProp => Entity;

		protected override async Task<ActionResult> internalExecute()
		{
			var entry = getEntry();
			if (entry == null || Entity == null)
				return new ActionResult(false);

			if (Entity.Properties == null || Entity.Properties.Count == 0)
				return new ActionResult(true, returnData: entry);

			//var json = JsonSerializer.Serialize(spec.Entry);
			//var map = Parser.DeserializeMap(JsonSerializer.Deserialize<JsonObject>(json));

			ReflectionUtil.PopulateClass(entry, new ModelNode(new Dictionary<string, object> { ["properties"] = Entity.Properties }));

			var methodToCall = ReflectionUtil.GetMethod(dbSet.GetType(), "Update", 1);
			methodToCall.Invoke(dbSet, [entry]);
			dbContext.SaveChanges();
			dbContext.Dispose();
			return new ActionResult(true, returnData: entry);
		}
	}

	public class Delete : ReadFirst
	{
		protected override IProperty<EntitySpec?>? entityProp => Entity;

		protected override async Task<ActionResult> internalExecute()
		{
			var entry = getEntry();
			if (entry == null)
				return new ActionResult(false);

			var methodToCall = ReflectionUtil.GetMethod(dbSet.GetType(), "Remove", 1);
			methodToCall.Invoke(dbSet, [entry]);
			dbContext.SaveChanges();
			dbContext.Dispose();
			return new ActionResult(true, returnData: entry);
		}
	}

	public class Count : IDataAction
	{
		public IEntitySelect? Entity { get; set; }
		public List<FilterRule>? Filters { get; set; }
		protected override IProperty<EntitySpec?>? entityProp => Entity;

		protected override async Task<ActionResult> internalExecute()
		{
			if (dbContext == null || spec == null || dbSet == null)
				return new ActionResult(false);

			var query = dbSet;
			if (Filters is List<FilterRule> rules)
				query = getQuery(rules);

			var methodToCall = ReflectionUtil.GetMethod(typeof(Enumerable), "Count", spec.Entity, 1);
			var results = methodToCall.Invoke(query, [query]);
			return new ActionResult(true, returnData: results);
		}
	}
}
