namespace LowderDotNet.Props
{
	public class RuleSet : IProperty<RuleSet>
	{
		public List<FilterRule> Filter { get; set; } = [];
		public List<OrderRule> Sort { get; set; } = [];
		public int? Page { get; set; }
		public int? PageSize { get; set; }

		public override Task<RuleSet> Build() => Task.FromResult(this);
	}

	public class FilterRule : IProperty<FilterRule>
	{
		public string? Attribute { get; set; }
		public FilterType? Type { get; set; }
		public object? Value { get; set; }
		public bool IgnoreIfEmpty { get; set; } = false;

		public override Task<FilterRule> Build() => Task.FromResult(this);

		public enum FilterType
		{
			Equal,
			NotEqual,
			Like,
			NotLike,
			StartsWith,
			EndsWith,
			Greater,
			GreaterOrEqual,
			Less,
			LessOrEqual,
			In,
			NotIn,
		}
	}

	public class OrderRule : IProperty<OrderRule>
	{
		public string? Attribute { get; set; }
		public OrderType? Sort { get; set; }

		public override Task<OrderRule> Build() => Task.FromResult(this);

		public enum OrderType
		{
			Ascending,
			Descending,
		}
	}
}
