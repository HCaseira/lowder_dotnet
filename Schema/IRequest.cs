using LowderDotNet.Model;
using LowderDotNet.Props;
using LowderDotNet.Utils;
using System.Collections;

namespace LowderDotNet.Schema
{
    public class IRequest : IProperty
    {
        public string? Url { get; set; }
        public string? Path { get; set; }
        public HttpMethod? Method { get; set; }
		public IModel? PathParameters { get; set; }
        public IModel? QueryArgs { get; set; }
        public IModel? Body { get; set; }

		public override object GetSchema()
		{
			var schema = (IDictionary<string, object>)base.GetSchema();
            schema["abstract"] = true;
			return schema;
		}

		public override void FromModel(object modelValue)
		{
			if (modelValue is not IDictionary map)
				return;

			var typeVal = map["_type"];
			if (typeVal is not string typeId)
				return;

			var request = Lowder.Model.GetType(typeId);
			if (request == null)
			{
				Lowder.LogError($"Request with id '{typeId}' not found in model");
				return;
			}

			var props = new Hashtable(request.Properties.ToHashtable().CloneMap());
			props.Merge(map);
			props.Remove("_type");

			base.FromModel(props);
		}
	}

    public enum HttpMethod
    {
        Get, Post, Put, Patch, Delete,
    }
}
