using System.Collections;
using System.Reflection;

namespace LowderDotNet.Utils
{
	public static class Extensions
	{
		public static IApplicationBuilder UseLowder(this IApplicationBuilder app, string modelFileName = "solution.low", string modelFolder = "_model")
		{
			return app.UseLowder<Lowder>(modelFileName, modelFolder);
		}

		public static IApplicationBuilder UseLowder<T>(this IApplicationBuilder app, string modelFileName = "solution.low", string modelFolder = "_model") where T : Lowder
		{
			ReflectionUtil.Init();
			Activator.CreateInstance(typeof(T), app, modelFileName, modelFolder);
			return app;
		}

		public static void EnqueueAll(this Queue queue, IEnumerable objects)
		{
			foreach (var obj in objects)
				queue.Enqueue(obj);
		}

		public static bool IsList(this PropertyInfo property, out Type? genericType) => IsList(property.PropertyType, out genericType);
		
		public static bool IsList(this Type type, out Type? genericType)
		{
			genericType = null;

			// Check if type is nullable
			var nullType = Nullable.GetUnderlyingType(type);
			if (nullType != null)
				type = nullType;

			var result = type.GetInterface(typeof(IEnumerable).FullName) != null;
			if (result)
			{
				if (type.IsArray)
				{
					genericType = type.GetElementType();
					return true;
				}
				else if (type.GenericTypeArguments.Length == 1)
				{
					genericType = type.GenericTypeArguments[0];
					return true;
				}
			}
			return false;
		}

		public static bool IsMap(this PropertyInfo property)
		{
			return IsMap(property.PropertyType) ||
				(property.PropertyType.IsGenericType && property.PropertyType.GetGenericTypeDefinition() == typeof(IDictionary<,>));
		}

		public static bool IsMap(this Type type)
		{
			return typeof(IDictionary).IsAssignableFrom(type) || typeof(IDictionary<,>).IsAssignableFrom(type);
		}

		public static void Merge(this IDictionary dic, IDictionary other)
		{
			foreach (var key in other.Keys)
			{
				var v1 = dic[key];
				var v2 = other[key];
				if (v1 is IDictionary d1 && v2 is IDictionary d2)
					Merge(d1, d2);
				else if (v1 is IList l1 && v2 is IList l2)
					foreach (var v in l2)
						l1.Add(l2);
				else
					dic[key] = v2;
			}
		}

		public static Hashtable ToHashtable(this IDictionary dic)
		{
			if (dic is Hashtable h)
				return h;

			var ht = new Hashtable();
			foreach (var key in dic.Keys)
				ht[key] = dic[key];
			return ht;
		}

		public static Hashtable ToHashtable(this IQueryCollection map)
		{
			var ht = new Hashtable();
			foreach (var key in map.Keys)
				ht[key] = map[key];
			return ht;
		}

		public static IDictionary<string, object?> ToDictionary(this IDictionary map)
		{
			if (map is Dictionary<string, object?> d)
				return d;

			var dic = new Dictionary<string, object?>();
			foreach (string key in map.Keys)
				dic[key] = map[key];
			return dic;
		}

		public static T CloneMap<T>(this T dic) where T : IDictionary
		{
			var newDic = Activator.CreateInstance<T>();
			foreach (var key in dic.Keys)
			{
				var v = dic[key];
				if (v is IDictionary d)
					v = d.ToHashtable().CloneMap();
				else if (v is IList l)
					v = l.ToArray().CloneList();
				newDic[key] = v;
			}
			return newDic;
		}

		public static ArrayList ToArray(this IList list)
		{
			if (list is ArrayList l)
				return l;

			var arr = new ArrayList();
			arr.AddRange(list);
			return arr;
		}

		public static T CloneList<T>(this T list) where T : IList
		{
			var newList = Activator.CreateInstance<T>();
			foreach (var v in list)
			{
				if (v is IDictionary d)
					newList.Add(d.ToHashtable().Clone());
				else if (v is IList l)
					newList.Add(l.ToArray().CloneList());
				else
					newList.Add(v);
			}
			return newList;
		}

		public static object? RemoveValueAt(this IList list, int idx)
		{
			var val = list[idx];
			list.RemoveAt(idx);
			return val;
		}

		/// Updates the content of a [Map] by evaluating it's values using [context] as context.
		public static void Evaluate(this IDictionary map, IDictionary? evaluatorContext)
		{
			if (evaluatorContext == null)
				return;
			var keys = new ArrayList(map.Keys);
			foreach (var key in keys)
				map[key] = evaluateValue(map[key], evaluatorContext);
		}

		/// Updates the content of a [List] by evaluating it's values using [context] as context.
		public static void Evaluate(this IList list, IDictionary? evaluatorContext)
		{
			if (evaluatorContext == null)
				return;
			for (var i = list.Count - 1; i >= 0; i--)
				list[i] = evaluateValue(list[i], evaluatorContext);
		}

		/// Returns the evaluated value of a given [value] using [evaluatorContext] as context.
		private static object? evaluateValue(object? value, IDictionary evaluatorContext)
		{
			if (value is string str)
				return str.Evaluate(evaluatorContext);
			else if (value is IDictionary map)
				map.Evaluate(evaluatorContext);
			else if (value is IList list)
				list.Evaluate(evaluatorContext);
			return value;
		}

		/// Evaluates a string using [evaluatorContext].
		/// A string containing ${<some var>} will be evaluated.
		/// E.g.: a string "${state.name}" will be replaced with the (evaluatorContext["state"] as IDictionary)["name"].
		public static object? Evaluate(this string? value, IDictionary evaluatorContext)
		{
			if (string.IsNullOrEmpty(value))
				return null;

			var startIdx = 0;
			while ((startIdx = value!.IndexOf("${", startIdx)) >= 0)
			{
				var endIdx = value.IndexOf("}", startIdx);
				if (endIdx < 0)
					return value;

				// A scenery of something like ${state.${env.nameKey}}
				var nextStartIdx = value.IndexOf("${", startIdx + 2);
				if (nextStartIdx >= 0 && nextStartIdx < endIdx)
				{
					startIdx = nextStartIdx;
					continue;
				}

				var valueToResolve = value.Substring(startIdx + 2, endIdx - startIdx - 2);
				var resolvedPart = evaluateStringPart(valueToResolve, evaluatorContext);
				if (value.Length == endIdx - startIdx + 1)
					return resolvedPart;

				value = value.Remove(startIdx, endIdx - startIdx + 1).Insert(startIdx, $"{resolvedPart ?? ""}");
				startIdx = 0;
			}
			return value;
		}

		private static object? evaluateStringPart(string value, IDictionary evaluatorContext)
		{
			// Check if is a function
			var functionParts = value.Split("(").ToList();
			if (functionParts.Count > 1)
			{
				var obj = evaluatorContext[functionParts.RemoveValueAt(0)];
				if (obj is Delegate func)
				{
					var argsString = functionParts[0].Substring(0, functionParts[0].Length - 1);
					if (!string.IsNullOrEmpty(argsString))
					{
						var args = argsString.Split(",");
						return func.DynamicInvoke(args);
					}
					return func.DynamicInvoke();
				}
			}

			var parts = value.Split(".").ToList();
			var evaluatedValue = evaluatorContext[parts.RemoveValueAt(0)];
			if (evaluatedValue == null || parts.Count == 0)
				return evaluatedValue;

			foreach (var part in parts)
			{
				if (evaluatedValue is IDictionary map)
				{
					if (!map.Contains(part))
						return null;
					evaluatedValue = map[part];
				}
				else if (evaluatedValue is IList list)
				{
					if (!int.TryParse(part, out var idx))
						idx = -1;
					if (idx < 0 || list.Count <= idx)
						return null;
					evaluatedValue = list[idx];
				}
				else if (evaluatedValue is object)
				{
					var prop = evaluatedValue.GetType().GetProperty(part);
					if (prop == null)
						return null;
					evaluatedValue = prop.GetValue(evaluatedValue);
				}
				else
					return null;
			}
			return evaluatedValue;
		}
	}
}
