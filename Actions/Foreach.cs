using LowderDotNet.Model;
using LowderDotNet.Utils;
using System.Collections;

namespace LowderDotNet.Actions
{
	public class Foreach : IStackAction
	{
		[EditorType("Json")]
		public List<object>? Array { get; set; }
		public string EntryName { get; set; } = "entry";
		public ActionNode? Do { get; set; }

		public override async Task<ActionResult> Execute()
		{
			if (Do == null)
				return new ActionResult(false);

			Context ??= [];
			Array ??= [];
			foreach (var obj in Array)
			{
				Context[EntryName] = obj;
				var result = await Lowder.RunAction(Do, Context, (Hashtable?)Context["state"]);
				if (!result.Success)
					return result;
			}

			Context.Remove(EntryName);
			return new ActionResult(true);
		}
	}
}
