using Microsoft.AspNetCore.Mvc;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace LowderDotNet.Controllers
{
	[ApiExplorerSettings(IgnoreApi = true)]
	[ApiController]
	[Route("[controller]")]
	public class LowderController : ControllerBase
	{
		private const string _editorFolder = "LowderDotNet._editor";
		public static readonly Queue<EditorMessage> ToEditor = new();

		[HttpGet("execute/{id}")]
		public async Task<ActionResult> ExecuteGet(string controllerId)
		{
			return Ok();
		}

		[HttpPost("execute/{id}")]
		public async Task<ActionResult> ExecutePost(string controllerId)
		{
			return Ok();
		}

		[HttpPut("execute/{id}")]
		public async Task<ActionResult> ExecutePut(string controllerId)
		{
			return Ok();
		}

		[HttpDelete("execute/{id}")]
		public async Task<ActionResult> ExecuteDelete(string controllerId)
		{
			return Ok();
		}

		[HttpGet]
		public async Task<FileResult> Index()
		{
			return await getFile("editor_webapi.html", "text/html");
		}

		[HttpGet("editor.css")]
		public async Task<FileResult> Css()
		{
			return await getFile("editor.css", "text/css");
		}

		[HttpGet("ui/{path}")]
		public async Task<FileResult> GetUiFile(string path)
		{
			return await getFile(Path.Combine("ui", path));
		}

		[HttpGet("model/{path}")]
		public async Task<FileResult> GetModelFile(string path)
		{
			return await getFile(Path.Combine("model", path));
		}

		[HttpGet("{path}")]
		public async Task<FileResult> GetFile(string path)
		{
			return await getFile(path);
		}

		private async Task<FileResult> getFile(string path, string mimeType = "application/javascript")
		{
			var fullPath = Path.Combine(_editorFolder, path);
			var stream = Assembly.GetAssembly(GetType()).GetManifestResourceStream(fullPath.Replace("\\", ".").Replace("/", "."));
			return File(stream, mimeType);
			//var content = await System.IO.File.ReadAllBytesAsync(Path.Combine(_editorFolder, path));
			//return File(content, mimeType);
		}

		[HttpGet("schema")]
		public async Task GetSchema()
		{
			var schema = Lowder.Schema.Get();
			await JsonSerializer.SerializeAsync(HttpContext.Response.Body, schema);
		}

		[HttpGet("model")]
		public async Task<ObjectResult> GetModel()
		{
			if (!System.IO.File.Exists(Lowder.ModelFilePath))
				return Ok(new
				{
					name = "API",
				});

			var model = await System.IO.File.ReadAllTextAsync(Lowder.ModelFilePath);
			return Ok(model);
		}

		[HttpPost("model")]
		public async Task<ActionResult> SaveModel([FromBody] JsonObject model)
		{
			if (!Directory.Exists(Lowder.ModelFolder))
				Directory.CreateDirectory(Lowder.ModelFolder);

			if (System.IO.File.Exists(Lowder.ModelFilePath))
				System.IO.File.Delete(Lowder.ModelFilePath);
			await System.IO.File.WriteAllTextAsync(Lowder.ModelFilePath, JsonSerializer.Serialize(model));
			Lowder.Reload();
			return Ok();
		}

		[HttpPut("model")]
		public async Task<ActionResult> UpdateMemoryModel([FromBody] JsonObject model)
		{
			return Ok();
		}

		[HttpGet("messages")]
		public async Task<ObjectResult> GetMessages()
		{
			while (ToEditor.Count == 0)
				await Task.Delay(200);
			return Ok(ToEditor.Dequeue());
		}
	}

	//public record EditorState
	//{
	//	public string environment { get; set; }
	//	public Model model { get; set; }
	//}

	public record EditorMessage
	{
		public string DataType { get; set; }
		public object Data { get; set; }
	}
}
