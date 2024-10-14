using LowderDotNet.Utils;
using System.Collections;

namespace LowderDotNet.Props
{
    public abstract class ICondition : IProperty<bool>
	{
		public ICondition? And { get; set; }
		public ICondition? Or { get; set; }

		public sealed override async Task<bool> Build()
		{
			if (!await Evaluate())
				return Or != null ? await Or.Build() : false;
			return And != null ? await And.Build() : true;
		}

		protected abstract Task<bool> Evaluate();
	}

	public class OperatorCondition : ICondition
	{
		public object Left { get; set; }
		public virtual OperatorEnum? Operator { get; set; }
		public object? Right { get; set; }

		protected override Task<bool> Evaluate()
		{
			sanitizeVars(out var left, out var right);
			if (Operator == null && left is bool)
				return Task.FromResult((bool)left);
			if (Operator == null)
				return Task.FromResult(false);
			return evaluate(left, Operator!.Value, right);
		}

		protected virtual void sanitizeVars(out object? left, out object? right)
		{
			if (Left is DateTime || Right is DateTime)
			{
				left = Parser.GetDateTime(Left);
				right = Parser.GetDateTime(Right);
			}
			else if (Left is decimal || Right is decimal)
			{
				left = Parser.GetDecimal(Left);
				right = Parser.GetDecimal(Right);
			}
			else if (Left is bool || Right is bool)
			{
				left = Parser.GetBool(Left);
				right = Parser.GetBool(Right);
			}
			else if (Left is string || Right is string)
			{
				left = Left?.ToString();
				right = Right?.ToString();
			}
			else
			{
				left = Left;
				right = Right;
			}
		}

		protected virtual Task<bool> evaluate(object? left, OperatorEnum op, object? right)
		{
			switch (op)
			{
				case OperatorEnum.Equal:
					return Task.FromResult(left == right);
				case OperatorEnum.NotEqual:
					return Task.FromResult(left != right);
				case OperatorEnum.Greater:
					if (left is IComparable greater)
						return Task.FromResult(greater.CompareTo(right) > 0);
					return Task.FromResult(false);
				case OperatorEnum.GreaterEqual:
					if (left is IComparable greaterEqual)
						return Task.FromResult(greaterEqual.CompareTo(right) >= 0);
					return Task.FromResult(false);
				case OperatorEnum.Less:
					if (left is IComparable less)
						return Task.FromResult(less.CompareTo(right) < 0);
					return Task.FromResult(false);
				case OperatorEnum.LessEqual:
					if (left is IComparable lessEqual)
						return Task.FromResult(lessEqual.CompareTo(right) <= 0);
					return Task.FromResult(false);
				case OperatorEnum.Contains:
				case OperatorEnum.NotContains:
					bool result;
					if (left is IList list)
						result = list.Contains(right);
					else if (left is IDictionary map)
					{
						if (right == null)
							return Task.FromResult(false);
						result = map.Contains(right);
					}
					else
						return Task.FromResult(false);
					return Task.FromResult(op == OperatorEnum.Contains ? result : !result);
				default:
					return Task.FromResult(false);
			}
		}

		public enum OperatorEnum
		{
			Equal,
			NotEqual,
			Greater,
			GreaterEqual,
			Less,
			LessEqual,
			Contains,
			NotContains,
		}
	}

	public class NullOrEmpty : ICondition
	{
		public object? Value { get; set; }
		public bool Not { get; set; } = false;

		protected override Task<bool> Evaluate()
		{
			var isEmpty = Value == null;
			if (Value != null)
			{
				if (Value is ICollection collection)
					isEmpty = collection.Count == 0;
				else if (Value is string str)
					isEmpty = string.IsNullOrEmpty(str);
			}
			return Task.FromResult(Not ? !isEmpty : isEmpty);
		}
	}
}

