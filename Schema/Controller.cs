using LowderDotNet.Model;
using LowderDotNet.Utils;
using System.Collections;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace LowderDotNet.Schema
{
    public class Controller : IEndpoint
    {
		public string? Path { get; set; }
		public IModel? QueryArgs { get; set; }
		public IModel? Body { get; set; }
		public IModel? Output { get; set; }
		public ActionNode? Get { get; set; }
		public ActionNode? Post { get; set; }
		public ActionNode? Put { get; set; }
		public ActionNode? Patch { get; set; }
		public ActionNode? Delete { get; set; }

		public Controller(HttpContext httpContext) : base(httpContext) { }

		public virtual async Task Run()
        {
			ActionNode? methodToExecute = null;
			switch (HttpContext.Request.Method.ToLower())
			{
				case "get":
					methodToExecute = Get;
					break;
				case "post":
					methodToExecute = Post;
					break;
				case "put":
					methodToExecute = Put;
					break;
				case "patch":
					methodToExecute = Patch;
					break;
				case "delete":
					methodToExecute = Delete;
					break;
			}

			if (methodToExecute == null)
			{
				await writeResponse(HttpStatusCode.NotFound);
				return;
			}
			if (!await canExecute())
			{
				await writeResponse(HttpStatusCode.Unauthorized);
				return;
			}

			var context = await getContext();
			var result = await Lowder.RunAction(methodToExecute, context);
			if (result.ReturnData is HttpStatusCode statusCode)
				await writeResponse(statusCode);
			else if (!result.Success)
				await writeResponse(HttpStatusCode.BadRequest);
			else
				await writeResponse(HttpStatusCode.OK, result.ReturnData);
		}

		protected override async Task<Hashtable> createContext()
		{
			var context = await base.createContext();
			context["query"] = HttpContext.Request.Query.ToHashtable();

			var path = HttpContext.Request.Path.Value ?? "";
			if (!string.IsNullOrEmpty(HttpContext.Request.PathBase))
				path = path.Replace(HttpContext.Request.PathBase.Value!, "");
			if (path.StartsWith('/'))
				path = path.Substring(1);
			var pathParts = path.Split('/');

			var expectedPath = Path ?? "";
			if (expectedPath.StartsWith('/'))
				expectedPath = expectedPath.Substring(1);
			if (expectedPath.EndsWith('/'))
				expectedPath = expectedPath[..^1];
			var expectedPathParts = expectedPath.Split('/');

			var pathMap = new Hashtable();
			for (var i = 0; i < expectedPathParts.Length; i++)
			{
				var part = expectedPathParts[i];
				if (!part.StartsWith('{') || !part.EndsWith('}'))
					continue;
				pathMap[part[1..^1]] = pathParts[i];
			}
			context["path"] = pathMap;

			try
			{
				using (var sr = new StreamReader(HttpContext.Request.Body))
				{
					var bodyStr = await sr.ReadToEndAsync();
					if (!string.IsNullOrEmpty(bodyStr))
					{
						if (bodyStr.StartsWith("{") && bodyStr.EndsWith("}"))
							context["body"] = Parser.DeserializeMap(JsonSerializer.Deserialize<JsonObject>(bodyStr));
						else if (bodyStr.StartsWith("[") && bodyStr.EndsWith("]"))
							context["body"] = Parser.DeserializeList(JsonSerializer.Deserialize<JsonArray>(bodyStr));
						else
							context["body"] = bodyStr;
					}
				}
			}
			catch (Exception ex)
			{
				Lowder.LogError("Error reading Request Body", ex);
			}
			return context;
		}

		protected virtual async Task<bool> writeResponse(HttpStatusCode statusCode, object? data = null)
		{
			var status = (int)statusCode;
			HttpContext.Response.StatusCode = status;
			if (data is string str)
			{
				HttpContext.Response.ContentType = "text/plain";
				await HttpContext.Response.WriteAsync(str, Encoding.UTF8);
			}
			else if (data is object)
			{
				HttpContext.Response.ContentType = "application/json";
				var json = JsonSerializer.Serialize(data, data.GetType());
				await HttpContext.Response.WriteAsync(json, Encoding.UTF8);
			}
			return status >= 200 && status < 300;
		}
	}
}