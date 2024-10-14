using System.Reflection;

namespace LowderDotNet.Model
{
	public class EntitySpec
	{
		public Type DbContext { get; set; }
		public PropertyInfo DbSet { get; set; }
		public Type Entity { get; set; }
		public object? Entry { get; set; }
	}
}
