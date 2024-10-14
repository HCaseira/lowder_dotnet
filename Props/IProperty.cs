using LowderDotNet.Model;
using LowderDotNet.Utils;
using System.Collections;

namespace LowderDotNet.Props
{
    public abstract class IProperty
    {
		public IProperty() { }

		public virtual object GetSchema()
		{
			return Lowder.Schema.GetTypeSchema(GetType());
		}

		public virtual void FromModel(object modelValue)
		{
			var node = Parser.GetModelNode<ModelNode>(new Hashtable { ["properties"] = modelValue });
			if (node == null)
				return;
			ReflectionUtil.PopulateClass(this, node);
		}
	}

    public abstract class IProperty<TOutput> : IProperty
    {
        public abstract Task<TOutput> Build();
    }
}
