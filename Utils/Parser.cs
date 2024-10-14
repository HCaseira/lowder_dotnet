using LowderDotNet.Model;
using System.Collections;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace LowderDotNet.Utils
{
    public static class Parser
	{
		public static bool GetBool(object? value, bool fallbackValue) => GetBool(value) ?? fallbackValue;
		public static bool? GetBool(object? value)
		{
			if (value == null)
				return null;
			if (value is bool b)
				return b;
			if (value is int || value is long || value is double || value is float || value is decimal)
				return GetInt(value) == 1;

			var str = $"{value}";
			return str.Equals("true", StringComparison.CurrentCultureIgnoreCase) || "1".Equals(str);
		}

		public static int GetInt(object? value, int fallbackValue) => GetInt(value) ?? fallbackValue;
		public static int? GetInt(object? value)
		{
			if (value == null)
				return null;
			if (value is int || value is long || value is double || value is float || value is decimal)
				return Convert.ToInt32(value);
			if (int.TryParse(value.ToString(), out var val))
				return val;
			return null;
		}

		public static long GetLong(object? value, long fallbackValue) => GetLong(value) ?? fallbackValue;
		public static long? GetLong(object? value)
		{
			if (value == null)
				return null;
			if (value is int || value is long || value is double || value is float || value is decimal)
				return Convert.ToInt64(value);
			if (long.TryParse(value.ToString(), out var val))
				return val;
			return null;
		}

		public static double GetDouble(object? value, double fallbackValue) => GetDouble(value) ?? fallbackValue;
		public static double? GetDouble(object? value)
		{
			if (value == null)
				return null;
			if (value is int || value is long || value is double || value is float || value is decimal)
				return Convert.ToDouble(value);
			if (double.TryParse(value.ToString(), out var val))
				return val;
			return null;
		}

		public static decimal GetDecimal(object? value, decimal fallbackValue) => GetDecimal(value) ?? fallbackValue;
		public static decimal? GetDecimal(object? value)
		{
			if (value == null)
				return null;
			if (value is int || value is long || value is double || value is float || value is decimal)
				return Convert.ToDecimal(value);
			if (decimal.TryParse(value.ToString(), out var val))
				return val;
			return null;
		}

		public static DateTime GetDateTime(object? value, DateTime fallbackValue) => GetDateTime(value) ?? fallbackValue;
		public static DateTime? GetDateTime(object? value)
		{
			if (value == null)
				return null;
			if (value is DateTime)
				return (DateTime)value;
			if (value is long || value is int)
				return DateTime.FromFileTimeUtc((long)value);
			if (DateTime.TryParse(value.ToString(), out var dt))
				return dt;
			return null;
		}

		public static T? GetModelNode<T>(object? obj) where T : ModelNode
		{
			if (obj == null)
				return null;

			if (obj is IDictionary dic)
				obj = dic.ToHashtable();
			if (obj is JsonObject json)
				obj = DeserializeMap(json);

			if (obj is T node)
				return node;
			if (obj is Hashtable nodeHt)
				return (T?)Activator.CreateInstance(typeof(T), nodeHt);
			return null;
		}

		public static Hashtable DeserializeDocument(JsonDocument doc)
		{
			var obj = doc.Deserialize<Hashtable>();
			if (obj != null)
				return sanitizeMap(obj);
			return [];
		}

		public static IList DeserializeList(JsonArray jsonArray)
		{
			var list = new List<object?>();
			var array = jsonArray.Deserialize<List<object?>>();
			if (array != null)
			{
				foreach (var e in array)
				{
					var entry = e;
					if (entry is JsonElement elem)
						entry = elem.deserialize();

					if (entry is JsonObject map)
						list.Add(DeserializeMap(map));
					else if (entry is JsonArray arr)
						list.Add(DeserializeList(arr));
					else
						list.Add(entry);
				}
			}
			return list;
		}

		public static Hashtable DeserializeMap(JsonObject jsonObj)
		{
			var obj = jsonObj.Deserialize<Hashtable>();
			if (obj != null)
				return sanitizeMap(obj);
			return [];
		}

		private static object? deserialize(this JsonElement elem)
		{
			switch (elem.ValueKind)
			{
				case JsonValueKind.String:
					return elem.Deserialize<string>();
				case JsonValueKind.Number:
					return elem.Deserialize<double>();
				case JsonValueKind.Array:
					return elem.Deserialize<JsonArray>();
				case JsonValueKind.Object:
					return elem.Deserialize<JsonObject>();
				case JsonValueKind.True:
					return true;
				case JsonValueKind.False:
					return false;
				default:
					return null;
			}
		}

		private static Hashtable sanitizeMap(IDictionary source)
		{
			var dict = new Hashtable();
			foreach (var key in source.Keys)
			{
				var entry = source[key];
				if (entry is JsonElement elem)
					entry = elem.deserialize();

				if (entry is JsonObject map)
					dict[key] = DeserializeMap(map);
				else if (entry is JsonArray arr)
					dict[key] = DeserializeList(arr);
				else
					dict[key] = entry;
			}
			return dict;
		}

		public static bool IsEmpty(object? val)
		{
			if (val == null)
				return true;
			if (val is string s)
				return string.IsNullOrEmpty(s);
			if (val is IEnumerable e)
				foreach (var i in e)
					return false;
			return false;
		}
	}
}
