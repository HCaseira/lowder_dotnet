namespace LowderDotNet.Model
{
    public class ActionResult
	{
		public bool Success { get; }
		public object? ReturnData { get; }
		public ActionNode? NextAction { get; internal set; }

		public ActionResult(bool success, object? returnData = null, ActionNode? nextAction = null)
		{
			Success = success;
			ReturnData = returnData;
			NextAction = nextAction;
		}
	}
}
