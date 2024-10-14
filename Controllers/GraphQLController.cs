//using GraphQL;
//using GraphQL.SystemTextJson;
//using LowderDotNet.GraphQL;
//using Microsoft.AspNetCore.Mvc;
//using System.Net;
//using System.Text.Json;
//using System.Text.Json.Serialization;

//namespace LowderDotNet.Controllers
//{
//	[ApiExplorerSettings(IgnoreApi = true)]
//	[ApiController]
//	[Route("[controller]")]
//	public class GraphQLController : ControllerBase
//	{
//		private readonly ILogger<GraphQLController> _logger;
//		private static readonly DocumentExecuter _executer = new();
//		private const string _contentType = "application/json";
//		private static readonly JsonSerializerOptions jsonDeserializerOptions = new() { PropertyNameCaseInsensitive = true };
//		private static readonly JsonSerializerOptions jsonSerializerOptions = new() { WriteIndented = true, PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

//		public GraphQLController(ILogger<GraphQLController> logger)
//		{
//			_logger = logger;
//		}

//		[HttpPost]
//		public async Task Post()
//		{
//			GraphQLRequest? request;
//			try
//			{
//				request = await JsonSerializer.DeserializeAsync<GraphQLRequest>
//				(
//					HttpContext.Request.Body,
//					jsonDeserializerOptions
//				);
//			}
//			catch (Exception e)
//			{
//				_logger.LogError(message: "Error deserializing GraphQL: ", exception: e);
//				return;
//			}

//			var results = await _executer.ExecuteAsync(options =>
//			{
//				options.Schema = GraphQlSchema.Instance;
//				options.Query = request!.Query;
//				options.OperationName = request.OperationName;
//				options.Variables = request.Variables;
//				options.User = HttpContext.User;
//				options.Listeners.Add(GraphQlSchema.Dataloader);
//			});

//			HttpContext.Response.ContentType = _contentType;
//			if (results.Errors?.Any() == true)
//			{
//				var errors = results.Errors.FirstOrDefault();
//				HttpContext.Response.StatusCode = (int)HttpStatusCode.BadRequest;
//				if (!string.IsNullOrEmpty(errors?.Code) && errors.InnerException == null)
//					_logger.LogWarning(message: $"Warn executing request {request!.OperationName}: {errors.Message}");
//				else
//					_logger.LogError(message: $"Error executing request {request!.OperationName}: {errors?.Message}", exception: errors?.InnerException);
//				results.Errors[0].Code = null;
//			}
//			else
//			{
//				_logger.LogDebug(message: $"Successfully executed request {request?.OperationName}");
//				HttpContext.Response.StatusCode = (int)HttpStatusCode.OK;
//			}

//			await JsonSerializer.SerializeAsync(HttpContext.Response.Body, results, jsonSerializerOptions);
//		}

//		public record GraphQLRequest
//		{
//			public string OperationName { get; set; }

//			public string Query { get; set; }

//			[JsonConverter(typeof(InputsJsonConverter))]
//			public Inputs Variables { get; set; }
//		}
//	}
//}