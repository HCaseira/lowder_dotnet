using LowderDotNet.Actions;
using LowderDotNet.Controllers;
using LowderDotNet.Model;
using LowderDotNet.Schema;
using System.Collections;
using System.Diagnostics;
using System.Net;
using System.Reflection;

namespace LowderDotNet
{
    public class Lowder
	{
		private static readonly Hashtable _emptyHt = [];
		private static Lowder? _instance;
		private static bool _devMode = false;
		private static IApplicationBuilder _app;
		private static ILogger? logger;
		public static LowderSchema Schema;
		public static LowderModel Model;
		internal static string ModelFolder { get; private set; } = "_model";
		internal static string ModelFilePath { get; private set; } = "solution.low";

		public Lowder(IApplicationBuilder app, string modelFileName = "solution.low", string modelFolder = "_model")
		{
			_instance = this;
			_app = app;
			ModelFolder = modelFolder;
			ModelFilePath = Path.Combine(modelFolder, modelFileName);
			init();
		}

		protected virtual void init()
		{
#if DEBUG
			_devMode = true;
#else
			_devMode = false;
#endif
			logger = GetService<ILogger>();
			Schema = createSchema;
			Model = createModel;
			loadModel(ModelFilePath);
			if (_app is WebApplication webApp)
			{
				_devMode = webApp.Configuration.GetValue("Lowder:DeveloperMode", _devMode);
				mapControllers(webApp);
			}
		}

		protected virtual void loadModel(string filePath)
		{
			Model.Load(ModelFilePath);
		}

		private void mapControllers(WebApplication app)
		{
			if (!_devMode)
			{
				var controllers = Model.GetControllers();
				foreach (var controller in controllers.Values)
					mapController(app, controller);
			}
			else
				app.MapFallback(fallBackAction);
		}

		protected virtual void mapController(WebApplication app, ModelNode controller)
		{
			var actions = controller.Actions.Keys.ToArray();
			if (actions.Length == 0)
				return;

			controller.Properties.TryGetValue("Path", out var pathVal);
			var path = ((string?)pathVal) ?? controller.Name.Replace(" ", "");
			foreach (var action in actions)
			{
				switch (action.ToLower())
				{
					case "get":
						app.MapGet(path, (ctx) => runController(controller.Id, ctx));
						break;
					case "post":
						app.MapPost(path, async (ctx) => await runController(controller.Id, ctx));
						break;
					case "put":
						app.MapPut(path, async (ctx) => await runController(controller.Id, ctx));
						break;
					case "patch":
						app.MapPatch(path, async (ctx) => await runController(controller.Id, ctx));
						break;
					case "delete":
						app.MapDelete(path, async (ctx) => await runController(controller.Id, ctx));
						break;
				}
			}
		}

		private async Task fallBackAction(HttpContext ctx)
		{
			var controllers = Model.GetControllers();
			var path = ctx.Request.Path.Value ?? "";
			if (!string.IsNullOrEmpty(ctx.Request.PathBase))
				path = path.Replace(ctx.Request.PathBase.Value!, "");
			if (path.StartsWith('/'))
				path = path.Substring(1);
			var pathParts = path.Split('/');

			int bestMatch = 0;
			ModelNode? bestMatchController = null;
			foreach (var controller in controllers.Values)
			{
				if (controller.Actions.Keys.FirstOrDefault(k => k.Equals(ctx.Request.Method, StringComparison.CurrentCultureIgnoreCase)) == null)
					continue;

				controller.Properties.TryGetValue("Path", out var prop);
				if (prop is string cPath && !string.IsNullOrEmpty((string?)cPath))
				{
					if (cPath.StartsWith('/'))
						cPath = cPath[1..];
					if (cPath.EndsWith('/'))
						cPath = cPath[..^1];
					var cPathParts = cPath.Split('/');
					if (cPathParts.Length != pathParts.Length)
						continue;

					int matches = 0;
					for (var i = 0; i < cPathParts.Length; i++)
					{
						var cPart = cPathParts[i];
						if (cPart.StartsWith('{') && cPart.EndsWith('}'))
							continue;
						if (cPart != pathParts[i])
						{
							matches = 0;
							break;
						}
						matches++;
					}
					if (matches > bestMatch)
					{
						bestMatch = matches;
						bestMatchController = controller;
					}
				}
			}

			if (bestMatchController != null)
				await runController(bestMatchController.Id, ctx);
			else
				ctx.Response.StatusCode = 404;
		}

		protected async Task runController(string id, HttpContext httpContext)
		{
			var controllerModel = Model.GetController(id);
			if (controllerModel == null || controllerModel.Actions == null)
			{
				logError($"Controller '{id}' not found in model");
				httpContext.Response.StatusCode = (int)HttpStatusCode.NotFound;
				return;
			}

			controllerModel.EvaluateProperties(getEvaluatorContext(_emptyHt, _emptyHt));
			var controller = Schema.CreateController(controllerModel, httpContext);
			if (controller == null)
			{
				httpContext.Response.StatusCode = (int)HttpStatusCode.NotFound;
				return;
			}

			controllerModel.Properties.TryGetValue("Path", out var pathVal);
			var path = ((string?)pathVal) ?? controllerModel.Name.Replace(" ", "");
			logInfo($"Executing {httpContext.Request.Method} '{path}' ({id})");
			await controller.Run();
		}

		protected async Task<ActionResult> runAction(ActionNode node, Hashtable context, Hashtable? state = null)
		{
			state ??= new Hashtable();
			var evaluatorContext = getEvaluatorContext(context, state);
			ActionResult? lastResult = null;
			var nextAction = node;

			while (nextAction != null)
			{
				lastResult = await executeAction(nextAction, evaluatorContext, state);
				if (!lastResult.Success)
					return lastResult;

				nextAction = lastResult.NextAction;
			}

			return lastResult ?? new ActionResult(false);
		}

		protected async Task<ActionResult> executeAction(ActionNode node, Hashtable evaluatorContext, Hashtable state)
		{
			var action = createAction(node, evaluatorContext);
			if (action == null)
				return new ActionResult(false);

			try
			{
				logInfo($"Executing '{action.GetType().Name}' ({node.Id})", context: evaluatorContext);
				var result = await action!.Execute();
				if (action is IStackAction stackAction)
				{
					if (result.ReturnData != state)
						state[stackAction.ReturnName] = result.ReturnData;

					result.NextAction ??= stackAction.NextAction;
				}
				return result;
			}
			catch (Exception e)
			{
				logError($"Error executing '{action.GetType().Name}' ({node.Id})", e, node);
				return new ActionResult(false, e.Message);
			}
		}

		protected virtual IAction? createAction(ActionNode node, Hashtable evaluatorContext)
		{
			node.EvaluateProperties(evaluatorContext);
			var action = Schema.CreateAction(node);
			if (action != null)
				action.Context = evaluatorContext;
			return action;
		}

		protected virtual Hashtable getEvaluatorContext(IDictionary context, IDictionary state)
		{
			var ht = new Hashtable(context)
			{
				["env"] = Model.EnvironmentVariables,
				["state"] = state,
			};
			return ht;
		}

		protected virtual LowderSchema createSchema => new LowderSchema();
		protected virtual LowderModel createModel => new LowderModel();

		protected void log(LogLevel level, string message, Exception? ex = null, object? context = null)
		{
			printLog(level, message, ex, context);
			if (_devMode)
			{
				string origin = "";
				try
				{
					MethodBase? method = null;
					var k = 1;
					var stackTrace = new StackTrace();
					while (k < stackTrace.GetFrames().Length
							&& (method = stackTrace.GetFrame(k).GetMethod()).Name.StartsWith("log", StringComparison.CurrentCultureIgnoreCase)
							|| method.Name == "MoveNext"
							|| method.DeclaringType == null
							|| method.DeclaringType.Namespace.StartsWith("System."))
						k++;
					if (method != null)
						origin = method.DeclaringType.Name;
				}
				catch (Exception) { }

				LowderController.ToEditor.Enqueue(new EditorMessage
				{
					DataType = "log",
					Data = new Hashtable
					{
						["origin"] = "server",
						["type"] = Enum.GetName(level),
						["message"] = $"{DateTime.Now} [{origin}] {message}",
						["context"] = context,
						["error"] = ex?.Message,
						["stackTrace"] = ex?.StackTrace,
					},
				});
			}
		}

		protected virtual void printLog(LogLevel level, string message, Exception? ex = null, object? context = null) => logger?.Log(level, message, ex);

		protected void logDebug(string message, Exception? ex = null, object? context = null) => log(LogLevel.Debug, message, ex, context);
		protected void logInfo(string message, Exception? ex = null, object? context = null) => log(LogLevel.Information, message, ex, context);
		protected void logWarning(string message, Exception? ex = null, object? context = null) => log(LogLevel.Warning, message, ex, context);
		protected void logError(string message, Exception? ex = null, object? context = null) => log(LogLevel.Error, message, ex, context);
		protected void logCritical(string message, Exception? ex = null, object? context = null) => log(LogLevel.Critical, message, ex, context);

		public static async Task<ActionResult> RunAction(ActionNode node, Hashtable context, Hashtable? state = null) => await _instance.runAction(node, context, state);
		public static T? GetService<T>() => _app.ApplicationServices.GetService<T>();
		public static object? GetService(Type type) => _app.ApplicationServices.GetService(type);
		public static void LogDebug(string message, Exception? ex = null, object? context = null) => _instance?.logDebug(message, ex, context);
		public static void LogInfo(string message, Exception? ex = null, object? context = null) => _instance?.logInfo(message, ex, context);
		public static void LogWarning(string message, Exception? ex = null, object? context = null) => _instance?.logWarning(message, ex, context);
		public static void LogError(string message, Exception? ex = null, object? context = null) => _instance?.logError(message, ex, context);
		public static void LogCritical(string message, Exception? ex = null, object? context = null) => _instance?.logCritical( message, ex, context);
		internal static void Reload() => _instance?.init();
	}
}
