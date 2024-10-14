using LowderDotNet.Model;
using LowderDotNet.Props;

namespace LowderDotNet.Schema
{
    public abstract class Graph : IEndpoint
	{
		public IModel Input { get; set; }
        public IModel Output { get; set; }
        public ICondition? Condition { get; set; }
        public ActionNode? Execute { get; set; }

		protected Graph(HttpContext httpContext) : base(httpContext) { }
	}

    public class Query : Graph
	{
		protected Query(HttpContext httpContext) : base(httpContext) { }
	}
    public class Mutation : Graph
	{
		protected Mutation(HttpContext httpContext) : base(httpContext) { }
	}
}
