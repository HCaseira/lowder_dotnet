//using GraphQL.DataLoader;
//using GraphQL.Types;

//namespace LowderDotNet.GraphQL
//{
//	public class GraphQlSchema : Schema
//	{
//		public static readonly GraphQlSchema Instance;
//		public static readonly DataLoaderContextAccessor DataLoaderAcessor = new();
//		public static readonly DataLoaderDocumentListener Dataloader = new(DataLoaderAcessor);

//		static GraphQlSchema()
//		{
//			Instance = new GraphQlSchema();
//		}

//		public GraphQlSchema()
//		{
//			var queries = new List<ServiceInfo>();
//			var mutations = new List<ServiceInfo>();
//		}
//	}

//	public struct ServiceInfo
//	{
//		public Type InputType;
//		public Type OutputType;
//	}
//}
