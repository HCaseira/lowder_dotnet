using LowderDotNet.Model;
using LowderDotNet.Utils;

namespace LowderDotNet.Actions
{
	[EditorHidden("ReturnName", "NextAction")]
	public class SwitchCase : IAction
	{
		public string? InputValue { get; set; }
		public ActionNodeMap? Conditions { get; set; }
		public ActionNode? Default { get; set; }

		public override async Task<ActionResult> Execute()
		{
			if ((Conditions == null || Conditions.Count == 0) && Default == null)
				return new ActionResult(false);

			if (Conditions != null)
			{
				foreach (var key in Conditions.Keys)
				{
					if (key.Equals(InputValue))
						return new ActionResult(true, nextAction: Conditions[key]);
				}
			}
			return new ActionResult(true, nextAction: Default);
		}
	}
}
