using LowderDotNet.Model;
using LowderDotNet.Utils;
using System.Collections;

namespace LowderDotNet.Props
{
	public class IEntity : IProperty<EntitySpec?>
    {
		protected EntitySpec? entitySpec;
		public IDictionary? Properties;

		public override Task<EntitySpec?> Build()
		{
			return Task.FromResult(entitySpec);
		}

		public override object GetSchema()
		{
			return new Dictionary<string, object>
			{
				["abstract"] = true,
			};
		}

		public override void FromModel(object modelValue)
		{
			if (modelValue is not IDictionary map)
				return;

			var entityName = (string?)map["_type"];
			if (string.IsNullOrEmpty(entityName))
				return;

			entitySpec = Lowder.Schema.GetEntity(entityName);
			if (entitySpec == null)
				return;

			Properties = map;
			var node = new ModelNode(new Hashtable { ["properties"] = map });
			entitySpec.Entry = ReflectionUtil.InstantiateClass(entitySpec.Entity, node);
		}
	}

    public class IEntitySelect : IProperty<EntitySpec?>
	{
		protected EntitySpec? entitySpec;

		public override Task<EntitySpec?> Build()
		{
			return Task.FromResult(entitySpec);
		}

		public override object GetSchema()
		{
			return Lowder.Schema.GetEntityNames();
		}

		public override void FromModel(object modelValue)
		{
			if (modelValue is string str)
				entitySpec = Lowder.Schema.GetEntity(str);
		}
	}
}
