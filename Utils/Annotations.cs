namespace LowderDotNet.Utils
{
	[AttributeUsage(AttributeTargets.Class)]
	public class EditorNameAttribute : Attribute
	{
		public readonly string Name;
		public EditorNameAttribute(string name) { Name = name; }
	}

	[AttributeUsage(AttributeTargets.Property)]
	public class EditorTypeAttribute : Attribute
	{
		public readonly string Type;
		public EditorTypeAttribute(string type) { Type = type; }
	}

	[AttributeUsage(AttributeTargets.Class)]
	public class EditorHiddenAttribute : Attribute
	{
		public readonly string[] Members;
		public EditorHiddenAttribute(params string[] members) { Members = members; }
	}
}
