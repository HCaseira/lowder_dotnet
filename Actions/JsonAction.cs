using LowderDotNet.Model;
using LowderDotNet.Utils;

namespace LowderDotNet.Actions
{
	public class JsonAction : IStackAction
	{
		[EditorType("Json")]
		public object? Json { get; set; }

		public override async Task<ActionResult> Execute() => new ActionResult(true, returnData: Json);
	}
}
