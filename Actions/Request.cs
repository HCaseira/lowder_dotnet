using LowderDotNet.Model;
using LowderDotNet.Schema;
using LowderDotNet.Utils;
using System.Collections;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace LowderDotNet.Actions
{
	public class Rest : IStackAction
	{
		private static readonly Dictionary<string, HttpClient> _clients = [];
		private static readonly JsonSerializerOptions _jsonSerializerOptions = new() { PropertyNameCaseInsensitive = true };

		public string? Url { get; set; }
		public string? Path { get; set; }
		public Schema.HttpMethod? Method { get; set; }
		public Hashtable? Headers { get; set; }
		public Hashtable? QueryArgs { get; set; }
		public Hashtable? Body { get; set; }

		public override async Task<ActionResult> Execute()
		{
			if (Method == null)
				return new ActionResult(false);

			var uri = getUri();
			if (uri == null)
				return new ActionResult(false);

			return await executeRequest(uri, new System.Net.Http.HttpMethod(Enum.GetName(typeof(Schema.HttpMethod), Method.Value)!));
		}

		protected virtual async Task<ActionResult> executeRequest(Uri uri, System.Net.Http.HttpMethod method)
		{
			using (var request = new HttpRequestMessage())
			{
				request.Method = method;
				request.RequestUri = uri;

				if (Headers != null && Headers.Count > 0)
				{
					foreach (var key in Headers.Keys)
					{
						var value = Headers[key];
						if (value is IEnumerable<string?> enumVal)
							request.Headers.Add($"{key}", enumVal);
						else if (value != null)
							request.Headers.Add($"{key}", $"{value}");
					}
				}

				if (Body != null)
					request.Content = new StringContent(JsonSerializer.Serialize(Body), Encoding.UTF8, "application/json");

				var client = getClient(uri);
				var response = await client.SendAsync(request);
				return await handleResponse(response, request);
			}
		}

		protected virtual async Task<ActionResult> handleResponse(HttpResponseMessage response, HttpRequestMessage request)
		{
			if (!response.IsSuccessStatusCode)
				return new ActionResult(false);

			if (response.Content is ByteArrayContent)
			{
				var bytes = await response.Content.ReadAsByteArrayAsync();
				return new ActionResult(true, bytes);
			}

			var str = await response.Content.ReadAsStringAsync();
			if (str == null)
				return new ActionResult(true);

			try
			{
				if (str.StartsWith('{') && str.EndsWith('}'))
				{
					var obj = JsonSerializer.Deserialize<JsonObject>(str);
					if (obj is JsonObject)
					{
						var map = Parser.DeserializeMap(obj);
						return new ActionResult(true, map);
					}
				}
				else if (str.StartsWith('[') && str.EndsWith(']'))
				{
					var obj = JsonSerializer.Deserialize<JsonArray>(str);
					if (obj is JsonArray)
					{
						var list = Parser.DeserializeList(obj);
						return new ActionResult(true, list);
					}
				}
			}
			catch (JsonException ex)
			{
				Lowder.LogError("Error parsing json response", ex);
			}
			return new ActionResult(true, str);
		}

		protected virtual Uri? getUri()
		{
			if (string.IsNullOrEmpty(Url))
				return null;

			var uri = new Uri(Url);
			if (!string.IsNullOrEmpty(Path))
				uri = new Uri(uri, Path);
			if (QueryArgs != null && QueryArgs.Count > 0)
			{
				var url = uri.ToString();
				var leadingChar = '&';
				if (!url.Contains('?'))
					leadingChar = '?';

				foreach (var key in QueryArgs.Keys)
				{
					url += $"{leadingChar}{key}={QueryArgs[key]}";
					leadingChar = '&';
				}
				uri = new Uri(url);
			}
			return uri;
		}

		protected virtual HttpClient getClient(Uri uri)
		{
			lock (_clients)
			{
				if (!_clients.ContainsKey(uri.Host))
					_clients.Add(uri.Host, new HttpClient());
				return _clients[uri.Host];
			}
		}
	}

	public class Request : IStackAction
	{
		public IRequest? request { get; set; }
		public Hashtable? Headers { get; set; }

		public override async Task<ActionResult> Execute()
		{
			if (request == null)
				return new ActionResult(false);

			var rest = new Rest
			{
				Url = request.Url,
				Path = request.Path,
				Method = request.Method,
				Headers = Headers,
			};

			if (request.QueryArgs != null)
				rest.QueryArgs = request.QueryArgs.Properties.ToHashtable();
			if (request.Body != null)
				rest.Body = request.Body.Properties.ToHashtable();

			return await rest.Execute();
		}
	}
}
