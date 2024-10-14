using LowderDotNet.Utils;
using System.Collections;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace LowderDotNet.Model
{
    public class LowderModel
    {
		protected Dictionary<string, ModelNode> _controllers = [];
		protected Dictionary<string, ModelNode> _graphs = [];
		protected Dictionary<string, ActionNode> _actions = [];
		protected Dictionary<string, IModel> _types = [];
		protected Dictionary<string, ModelNode> _folders = [];
		protected Dictionary<string, Dictionary<string, string>> _environmentVariables = [];
        protected string _environment = "Prod";

		public virtual void Load(params string[] filePath)
        {
            var model = new Hashtable();
            foreach (var path in filePath)
            {
                if (File.Exists(path))
                {
                    var json = File.ReadAllText(path);
                    if (!string.IsNullOrEmpty(json))
                    {
                        var document = JsonSerializer.Deserialize<JsonObject>(json);
                        if (document != null)
                            model.Merge(Parser.DeserializeMap(document));
                    }
                }
            }

            _controllers = loadNodes<ModelNode>(model["controllers"]);
            _graphs = loadNodes<ModelNode>(model["graphs"]);
            _actions = loadNodes<ActionNode>(model["actions"]);
            _types = loadNodes<IModel>(model["types"]);
            _folders = loadNodes<ModelNode>(model["folders"]);
            _environmentVariables = loadEnvironmentVariables(model["environmentData"]);
        }

        public ModelNode? GetController(string id) => (ModelNode?)_controllers[id];
        public ModelNode? GetGraph(string id) => (ModelNode?)_graphs[id];
        public ModelNode? GetAction(string id) => (ModelNode?)_actions[id];
        public ModelNode? GetType(string id) => (ModelNode?)_types[id];
        public ModelNode? GetFolder(string id) => (ModelNode?)_folders[id];

		internal Dictionary<string, ModelNode> GetControllers() => _controllers;
        internal Dictionary<string, ModelNode> GetGraphs() => _graphs;
        public Dictionary<string, string> EnvironmentVariables => _environmentVariables[_environment] ?? [];

		protected Dictionary<string, T> loadNodes<T>(object? value) where T : ModelNode
        {
            if (value == null)
                return [];
            if (value is Dictionary<string, T> v)
                return v;

            var map = new Dictionary<string, T>();
            if (value is IList l)
            {
                foreach (var entry in l)
                {
                    var node = loadNode<T>(entry);
                    if (node != null)
                        map[node.Id] = node;
                }
                return map;
            }
            if (value is IDictionary dic)
            {
                foreach (var key in dic.Keys)
                {
                    var node = loadNode<T>(dic[key]);
                    if (node != null)
                        map[node.Id] = node;
                }
                return map;
            }
            return map;
        }

        protected T? loadNode<T>(object? value) where T : ModelNode
        {
            return Parser.GetModelNode<T>(value);
        }

        protected Dictionary<string, Dictionary<string, string>> loadEnvironmentVariables(object? value)
        {
            if (value is not IDictionary map)
                return [];

            var variables = new Dictionary<string, Dictionary<string, string>>();
			var environments = (IList?)map["environments"];
			var keys = (IList?)map["keys"];
			var values = (IList?)map["values"];
            if (environments == null || keys == null || values == null)
                return [];

            for (var i = 0; i < environments.Count; i++)
            {
                var envVars = new Dictionary<string, string>();
                variables[environments[i] as string] = envVars;

                for (var j = 0; j < keys.Count; j++)
					envVars[keys[j] as string] = ((string?)((IList)values[j])[i]) ?? "";
			}
			return variables;
        }

        public void setEnvironment(string environment)
        {
            if (_environmentVariables.ContainsKey(environment))
				_environment = environment;
		}
    }
}
