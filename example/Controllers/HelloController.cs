using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace example.Controllers
{
	[AllowAnonymous]
	[ApiController]
	[Route("[controller]")]
	public class HelloController : Controller
	{
		private static string _message = "Hello World";

		[HttpGet]
		public string Get()
		{
			return _message;
		}

		[HttpPost]
		public ActionResult Post([FromQuery] string message)
		{
			if (string.IsNullOrEmpty(message))
				return BadRequest();

			_message = message;
			return Ok();
		}
	}
}
