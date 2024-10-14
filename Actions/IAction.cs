using LowderDotNet.Model;
using System.Collections;

namespace LowderDotNet.Actions
{
	public abstract class IAction
	{
		public Hashtable? Context;
		public abstract Task<ActionResult> Execute();
	}

	public abstract class IStackAction : IAction
	{
		public string ReturnName { get; set; } = "value";
		public ActionNode? NextAction { get; set; }
    }
}
