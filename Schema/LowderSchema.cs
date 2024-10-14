using LowderDotNet.Actions;
using LowderDotNet.Model;
using LowderDotNet.Props;
using LowderDotNet.Utils;
using Microsoft.EntityFrameworkCore;
using System.Reflection;

namespace LowderDotNet.Schema
{
    public class LowderSchema : IReflectionClass
    {
        protected static readonly Dictionary<string, Type> _controllers = [];
		protected static readonly Dictionary<string, Type> _graphs = [];
		protected static readonly Dictionary<string, Type> _actions = [];
		protected static readonly Dictionary<string, Type> _properties = [];
		protected static readonly Dictionary<string, EntitySpec> _entities = [];

		public virtual Controller? CreateController(ModelNode node, HttpContext httpContext)
		{
			if (!_controllers.TryGetValue(node.Type, out Type? type))
			{
				Lowder.LogError($"No Controller found with type '{node.Type}' (${node.Id}).");
				return null;
			}
			return (Controller?)ReflectionUtil.InstantiateClass(type, node, httpContext);
		}

		public virtual Graph? CreateGraph(ModelNode node)
		{
			if (!_graphs.TryGetValue(node.Type, out Type? type))
			{
				Lowder.LogError($"No Graph found with type '{node.Type}' (${node.Id}).");
				return null;
			}
			return (Graph?)ReflectionUtil.InstantiateClass(type, node);
		}

		public virtual IAction? CreateAction(ModelNode node)
        {
            if (!_actions.TryGetValue(node.Type, out Type? type))
            {
				Lowder.LogError($"No Action found with type '{node.Type}' (${node.Id}).");
                return null;
            }
            return (IAction?)ReflectionUtil.InstantiateClass(type, node);
        }

        internal Dictionary<string, object> Get()
        {
            var controllerSchema = new Dictionary<string, Dictionary<string, object>>();
            foreach (var key in _controllers.Keys)
                controllerSchema[key] = GetTypeSchema(_controllers[key]);

            var graphSchema = new Dictionary<string, Dictionary<string, object>>();
            foreach (var key in _graphs.Keys)
                graphSchema[key] = GetTypeSchema(_graphs[key]);

            var actionSchema = new Dictionary<string, Dictionary<string, object>>();
            foreach (var key in _actions.Keys)
                actionSchema[key] = GetTypeSchema(_actions[key]);

            var propertySchema = new Dictionary<string, object>();
            foreach (var key in _properties.Keys)
            {
                var type = _properties[key];
                if (!type.IsAbstract)
                {
					var propInstance = (IProperty?)ReflectionUtil.InstantiateClass(type);
					if (propInstance != null)
						propertySchema[key] = propInstance.GetSchema();
				}
				else
					propertySchema[key] = GetTypeSchema(type);
			}

            foreach (var key in _entities.Keys)
            {
                var entitySpec = _entities[key];
                var entityProp = GetTypeSchema(entitySpec.Entity);
                entityProp["extends"] = "IEntity";
                propertySchema[key] = entityProp;
            }

			return new Dictionary<string, object>
            {
                ["controllers"] = controllerSchema,
                ["graphs"] = graphSchema,
                ["actions"] = actionSchema,
                ["properties"] = propertySchema,
                ["filePath"] = Lowder.ModelFilePath,
            };
        }

        public Dictionary<string, object> GetTypeSchema(Type type)
        {
            var model = new Dictionary<string, object>();
            var modelProps = new Dictionary<string, object>();
            var modelActions = new Dictionary<string, object>();
            model["abstract"] = type.IsAbstract;
            model["extends"] = type.BaseType?.Name ?? "";
            model["properties"] = modelProps;
            model["actions"] = modelActions;

            var props = type.GetProperties();
            foreach (var prop in props)
            {
                // Ignore non-public properties
                if (prop.GetSetMethod(false) == null)
                    continue;

                var map = modelProps;
                var isArray = false;
                var propType = prop.PropertyType;

				// Check if propType is nullable
				var nullType = Nullable.GetUnderlyingType(propType);
				if (nullType != null)
					propType = nullType;

				if (prop.IsList(out var genericType))
                {
                    isArray = true;
                    propType = genericType!;

					// Check again if propType is nullable. It may be a List of nullable type.
					nullType = Nullable.GetUnderlyingType(propType);
					if (nullType != null)
						propType = nullType;
				}

                var propName = propType.Name;
                if (propType == typeof(ActionNode))
                {
                    map = modelActions;
                    propName = typeof(IAction).Name;
				}
                else if (propType == typeof(ActionNodeMap))
				{
					map = modelActions;
					propName = typeof(ActionNodeMap).Name;
				}
				if (map.ContainsKey(prop.Name))
                    continue;

				if (Attribute.IsDefined(prop, typeof(EditorTypeAttribute)))
                {
					map[prop.Name] = prop.GetCustomAttribute<EditorTypeAttribute>().Type;
                    continue;
                }

				if (propType.IsAssignableTo(typeof(IProperty)))
                {
					if (isArray)
						map[prop.Name] = $"[{propName}]";
					else
						map[prop.Name] = propName;
				}
				else if (propType.IsEnum)
                {
                    var list = new List<string>();
                    var enumValues = Enum.GetValues(propType);
                    for (var i = 0; i < enumValues.Length; i++)
                        list.Add(enumValues.GetValue(i).ToString());
                    map[prop.Name] = list;
                }
                else if (prop.IsMap() && !propType.IsAssignableTo(typeof(ActionNodeMap)))
                    map[prop.Name] = "Json";
                else if (isArray)
					map[prop.Name] = $"[{propName}]";
				else
					map[prop.Name] = propName;
			}
            return model;
        }

        public EntitySpec? GetEntity(string name) => _entities[name];

        public string[] GetEntityNames()
        {
			var entityList = new List<string>(_entities.Keys);
			entityList.Sort();
			return entityList.ToArray();
		}

		public Type[] GetTypes()
        {
            return [typeof(Controller), typeof(Graph), typeof(IAction), typeof(IProperty), typeof(DbContext)];
        }

		public void LoadTypes(IDictionary<Type, List<Type>> typesFound)
        {
            loadTypes(_controllers, typesFound[typeof(Controller)]);
            loadTypes(_graphs, typesFound[typeof(Graph)]);
            loadTypes(_actions, typesFound[typeof(IAction)]);
			loadTypes(_properties, typesFound[typeof(IProperty)]);
			loadEntities(typesFound[typeof(DbContext)]);
		}

        private void loadTypes(IDictionary<string, Type> repo, List<Type> types)
        {
            if (types == null)
                return;

            foreach (var type in types)
            {
                var name = type.Name;
                if (repo.TryGetValue(name, out var oldType))
                {
                    if (!type.IsSubclassOf(oldType))
                    {
						Lowder.LogWarning($"Ignoring class '{type.FullName}'. Using '{oldType.FullName}'.");
                        continue;
                    }
					Lowder.LogInfo($"Overriding class '{oldType.FullName}' with '{type.FullName}'.");
                }
                repo[name] = type;
            }
        }

        private void loadEntities(List<Type> types)
        {
            var baseType = typeof(DbSet<>);
			foreach (var dbContext in types)
            {
                var dbContextMap = new Dictionary<string, Type>();
                foreach (var prop in dbContext.GetProperties())
                {
                    if (!prop.PropertyType.IsConstructedGenericType || prop.PropertyType.GetGenericTypeDefinition() != baseType)
                        continue;

                    _entities[$"{dbContext.Name}.{prop.Name}"] = new EntitySpec
                    {
                        DbContext = dbContext,
						DbSet = prop,
                        Entity = prop.PropertyType.GetGenericArguments()[0],
					};
				}
            }
        }
    }
}