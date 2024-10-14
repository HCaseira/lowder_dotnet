using LowderDotNet.Model;
using LowderDotNet.Props;
using LowderDotNet.Utils;

namespace LowderDotNet.Actions
{
	[EditorHidden("ReturnName", "NextAction")]
    public class If : IAction
	{
		public ICondition? Condition { get; set; }
		public ActionNode? OnTrue { get; set; }
		public ActionNode? OnFalse { get; set; }

		public override async Task<ActionResult> Execute()
		{
			if (Condition == null || !await Condition.Build())
				return new ActionResult(true, nextAction: OnFalse);
			return new ActionResult(true, nextAction: OnTrue);
		}
	}
}
