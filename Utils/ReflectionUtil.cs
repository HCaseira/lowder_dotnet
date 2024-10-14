using LowderDotNet.Model;
using LowderDotNet.Props;
using System.Collections;
using System.Reflection;

namespace LowderDotNet.Utils
{
	public static class ReflectionUtil
	{
		public static void Init(string searchPattern = "*")
		{
			//_logger = logger;
			loadAssemblies(searchPattern);
		}

		private static void loadAssemblies(string searchPattern)
		{
			var baseType = typeof(IReflectionClass);
			var validAssemblies = new List<Assembly>();
			var IReflectionClassList = new List<Type>();

			var assemblies = AppDomain.CurrentDomain.GetAssemblies();
			var directory = AppDomain.CurrentDomain.RelativeSearchPath;
			if (directory == null)
				directory = AppDomain.CurrentDomain.BaseDirectory;

			string[] assemblyNames = Directory.GetFiles(directory, searchPattern);
			for (int i = 0; i < assemblyNames.Length; i++)
			{
				try
				{
					Assembly? assembly = null;
					bool found = false;
					for (int j = 0; j < assemblies.Length; j++)
					{
						if (assemblies[j].Location.Replace("file:///", "").Replace("\\", "/").Equals(assemblyNames[i].Replace("\\", "/"), StringComparison.InvariantCultureIgnoreCase))
						{
							assembly = assemblies[j];
							found = true;
							break;
						}
					}
					if (!found)
						assembly = Assembly.LoadFrom(assemblyNames[i]);

					if (assembly != null)
					{
						var typesFound = getTypes(assembly, new Type[] { baseType });
						if (typesFound.ContainsKey(baseType))
							IReflectionClassList.AddRange(typesFound[baseType]);
						validAssemblies.Add(assembly);
					}
				}
				catch { }
			}

			foreach (var classs in IReflectionClassList)
			{
				try
				{
					var instance = (IReflectionClass?)Activator.CreateInstance(classs);
					if (instance == null)
						continue;

					var types = instance.GetTypes();
					var typeMap = new Dictionary<Type, List<Type>>();
					foreach (var assembly in validAssemblies)
					{
						var typesFound = getTypes(assembly, types);
						if (typesFound.Count > 0)
						{
							foreach (var key in typesFound.Keys)
							{
								if (!typeMap.ContainsKey(key))
									typeMap[key] = new List<Type>();
								typeMap[key].AddRange(typesFound[key]);
							}
						}
					}

					if (typeMap.Count > 0)
						instance.LoadTypes(typeMap);
				}
				catch
				{
					Lowder.LogError($"Error handling IReflectionClass class '{classs.Name}'");
				}
			}
		}

		private static Dictionary<Type, List<Type>> getTypes(Assembly assembly, ICollection<Type> searchTypes)
		{
			var typesFound = new Dictionary<Type, List<Type>>();
			var types = assembly.GetTypes();
			foreach (var aType in types)
			{
				try
				{
					foreach (var baseType in searchTypes)
					{
						if (baseType.IsAssignableFrom(aType) /*&& !aType.IsAbstract*/)
						{
							if (!typesFound.ContainsKey(baseType))
								typesFound[baseType] = new List<Type>();
							typesFound[baseType].Add(aType);
						}
					}
				}
				catch (TypeLoadException)
				{
				}
				catch { }
			}
			return typesFound;
		}

		public static object? InstantiateClass(Type type, params object[] contructorArgs)
		{
			object? instance;
			try
			{
				instance = Activator.CreateInstance(type, contructorArgs);
			}
			catch (Exception ex)
			{
				Lowder.LogError($"Error creating instance of class '{type.FullName}'.", ex);
				return null;
			}

			if (instance == null)
			{
				Lowder.LogError($"Unable to create instance of class '{type.FullName}'.");
				return null;
			}

			return instance;
		}

		public static object? InstantiateClass(Type type, ModelNode node, params object[] contructorArgs)
		{
			var instance = InstantiateClass(type, contructorArgs);
			if (instance != null)
				PopulateClass(instance!, node);
			return instance;
		}

		public static void PopulateClass(object instance, ModelNode node)
		{
			var type = instance.GetType();
			var modelProps = node.Properties;
			var actionProps = node.Actions;

			var instanceProps = type.GetProperties();
			foreach (var prop in instanceProps)
			{
				try
				{
					if (!prop.CanWrite)
					{
						Lowder.LogInfo($"Ignoring read-only property '${prop.Name}' on class '{type.FullName}' (${node.Id}).");
						continue;
					}

					// Check if propType is nullable
					var propType = prop.PropertyType;
					var nullType = Nullable.GetUnderlyingType(propType);
					if (nullType != null)
						propType = nullType;

					if (propType.IsAssignableTo(typeof(ActionNode)))
					{
						if (actionProps.TryGetValue(prop.Name, out var action) && action != null)
							prop.SetValue(instance, Parser.GetModelNode<ActionNode>(action), null);
						continue;
					}
					if (propType.IsAssignableTo(typeof(ActionNodeMap)))
					{
						prop.SetValue(instance, new ActionNodeMap(actionProps));
						continue;
					}

					if (modelProps == null || !modelProps.TryGetValue(prop.Name, out object? value))
						continue;

					if (value == null)
						prop.SetValue(instance, null);
					else if (prop.IsList(out var childType))
					{
						var list = (IList)Activator.CreateInstance(typeof(List<>).MakeGenericType(childType));
						foreach (var entry in (ICollection)value)
							list.Add(parseValue(childType, entry));

						if (prop.PropertyType.IsArray)
							prop.SetValue(instance, list.GetType().GetMethod("ToArray").Invoke(list, null));
						else
							prop.SetValue(instance, list);
					}
					else
						prop.SetValue(instance, parseValue(prop.PropertyType, value));
				}
				catch (Exception ex)
				{
					Lowder.LogError($"Error setting property '${prop.Name}' on class '{type.FullName}' (${node.Id}).", ex);
				}
			}
		}

		public static MethodInfo? GetMethod(Type fromType, string name, int paramsCount)
		{
			var list = fromType.GetMethods().Where(m => m.Name == name);
			return list.Where((m) => m.GetParameters().Length == paramsCount).First();
		}

		public static MethodInfo? GetMethod(Type fromType, string name, Type withGenericType, int paramsCount)
		{
			var list = fromType.GetMethods().Where(m => m.Name == name);
			return list
				.Where((m) => m.ContainsGenericParameters && m.GetParameters().Length == paramsCount)
				.First()?
				.MakeGenericMethod(withGenericType);
		}

		private static object? parseValue(Type type, object? value)
		{
			if (value == null)
				return null;

			// Check if type is nullable
			var nullType = Nullable.GetUnderlyingType(type);
			if (nullType != null)
				type = nullType;

			if (type.IsAssignableTo(typeof(IModel)))
			{
				// Check if it is a reference to a Model node
				if (value is IDictionary dic)
				{
					dic.Remove("_type");
					return new IModel(new Hashtable { ["properties"] = dic });
				}
				if (value is string typeId)
					value = Lowder.Model.GetType(typeId);
			}

			if (type.IsAssignableTo(typeof(IProperty)))
			{
				var prop = (IProperty?)Activator.CreateInstance(type);
				if (prop != null)
					prop.FromModel(value!);
				return prop;
			}
			else if (type.IsEnum)
			{
				var enumValues = Enum.GetValues(type);
				if (value is int intVal)
					return enumValues.GetValue(intVal);
				if (value is string stringVal)
				{
					for (var i = 0; i < enumValues.Length; i++)
					{
						var enumVal = enumValues.GetValue(i);
						if (enumVal.ToString() == stringVal)
							return enumVal;
					}
				}
			}
			else if (type == typeof(string))
				return value.ToString();
			else if (type == typeof(bool))
				return Parser.GetBool(value);
			else if (type == typeof(int))
				return Parser.GetInt(value);
			else if (type == typeof(double))
				return Parser.GetDouble(value);
			else if (type == typeof(long))
				return Parser.GetLong(value);
			else if (type == typeof(decimal))
				return Parser.GetDecimal(value);
			else if (type == typeof(DateTime))
				return Parser.GetDateTime(value);
			//else if (type.IsMap())
			//    Parser.DeserializeDictionary

			return value;
		}
	}

	public interface IReflectionClass
	{
		void LoadTypes(IDictionary<Type, List<Type>> typesFound);
		Type[] GetTypes();
	}
}
