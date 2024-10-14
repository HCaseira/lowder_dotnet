using LowderDotNet.Utils;
using System.Collections;
using System.Collections.ObjectModel;

namespace LowderDotNet.Model
{
	public class IModel : ModelNode
	{
		public IModel(IDictionary map) : base(map) { }
	}

	public class ModelNode
    {
        private static readonly ReadOnlyDictionary<string, object?> _emptyDic = new(new Dictionary<string, object?>());
        protected readonly ReadOnlyDictionary<string, object?> Model;
        public readonly ReadOnlyDictionary<string, object?> Actions;
		public ReadOnlyDictionary<string, object?> Properties {  get; private set; }
		protected readonly Dictionary<string, object?> properties;

        public readonly string Id;
        public readonly string Type;
        public readonly string Name;
        public readonly string Folder;

        public ModelNode(IDictionary map)
        {
            Model = new ReadOnlyDictionary<string, object?>(map.ToDictionary());

			Id = string.Empty;
			Type = string.Empty;
			Name = string.Empty;
			Folder = string.Empty;
			Actions = _emptyDic;
			properties = [];

			if (Model.TryGetValue("_id", out var id))
                Id = id is string ? (string)id : string.Empty;
			if (Model.TryGetValue("_type", out var type))
				Type = type is string ? (string)type : string.Empty;
			if (Model.TryGetValue("name", out var name))
				Name = name is string ? (string)name : string.Empty;
			if (Model.TryGetValue("_folder", out var folder))
				Folder = folder is string ? (string)folder : string.Empty;
			if (Model.TryGetValue("actions", out var actions) && actions is IDictionary actionsDic)
				Actions = new ReadOnlyDictionary<string, object?>(actionsDic.ToDictionary());
			if (Model.TryGetValue("properties", out var props) && props is IDictionary propsDic)
				properties = new Dictionary<string, object?>(propsDic.ToDictionary());
			Properties = new ReadOnlyDictionary<string, object?>(properties);
		}

		public void EvaluateProperties(IDictionary evaluatorContext)
		{
			var newProps = properties.CloneMap();
			newProps.Evaluate(evaluatorContext);
			Properties = new ReadOnlyDictionary<string, object?>(newProps);
		}
    }

    public class ActionNode : ModelNode
    {
        public ActionNode(IDictionary map) : base(map) { }
    }

	public class ActionNodeMap : Dictionary<string, ActionNode>
	{
		public ActionNodeMap(IDictionary map)
		{
			foreach (string key in map.Keys)
			{
				var actionMap = map[key];
                if (actionMap is ActionNode action)
					this[key] = action;
				else if (actionMap is IDictionary dic)
					this[key] = new ActionNode(dic);
			}
		}
	}
}
