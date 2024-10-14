using LowderDotNet.Props;
using System.Collections;
using System.Security.Claims;

namespace LowderDotNet.Schema
{
	public abstract class IEndpoint
	{
		private Hashtable? _context;
		protected readonly HttpContext HttpContext;
		protected readonly List<string> Roles = [];
		protected readonly List<string> Scopes = [];
		protected readonly Dictionary<string, string> Claims = [];

		public bool AllowAnonymous { get; set; } = false;
		public string? AllowedRoles { get; set; }
		public string? AllowedScopes { get; set; }
		public ICondition? AllowedCondition { get; set; }

		public IEndpoint(HttpContext httpContext)
		{
			HttpContext = httpContext;

			//var appIdentity = new ClaimsIdentity(new List<Claim>
			//{
			//	new Claim(ClaimTypes.NameIdentifier, "0000045571"),
			//	new Claim(ClaimTypes.Role, "patient"),
			//	new Claim(ClaimTypes.Role, "patreon"),
			//	new Claim("http://schemas.microsoft.com/identity/claims/scope", "vida-prtl"),
			//	new Claim("http://schemas.microsoft.com/identity/claims/scope", "mbpm"),
			//	new Claim(ClaimTypes.Name, "Júlio Cardozo"),
			//	new Claim(ClaimTypes.NameIdentifier, "0000045571"),
			//	new Claim(ClaimTypes.Actor, "actor"),
			//	new Claim(ClaimTypes.Expiration, "1645447574"),
			//	new Claim("sub", "0000045571"),
			//});
			//httpContext.User.AddIdentity(appIdentity);

			foreach (var claim in HttpContext.User.Claims)
			{
				if (!Claims.ContainsKey(claim.Type))
					Claims[claim.Type] = claim.Value;
				else
					Claims[claim.Type] += $",{claim.Value}";
				if (claim.Type == ClaimTypes.Role || claim.Type == "role")
					Roles.Add(claim.Value);
				else if (claim.Type == "http://schemas.microsoft.com/identity/claims/scope" || claim.Type == "scope")
					Scopes.Add(claim.Value);
			}
		}

		protected virtual async Task<bool> canExecute()
		{
			if (!AllowAnonymous)
			{
				if (!HttpContext.User.Identity?.IsAuthenticated ?? false)
				{
					Lowder.LogInfo("User is not authenticated");
					return false;
				}

				if (!string.IsNullOrEmpty(AllowedRoles))
				{
					var inRole = false;
					var roles = AllowedRoles.Split(",");
					foreach (var role in roles)
					{
						if (Roles.Contains(role))
						{
							inRole = true;
							break;
						}
					}
					if (!inRole)
					{
						Lowder.LogInfo("User does not have the required Role");
						return false;
					}
				}
				if (!string.IsNullOrEmpty(AllowedScopes))
				{
					var inScope = false;
					var scopes = AllowedScopes.Split(",");
					foreach (var scope in scopes)
					{
						if (Scopes.Contains(scope))
						{
							inScope = true;
							break;
						}
					}
					if (!inScope)
					{
						Lowder.LogInfo("User does not have the required Scope");
						return false;
					}
				}
			}
			if (AllowedCondition != null && !await AllowedCondition!.Build())
			{
				Lowder.LogInfo("Conditions not met");
				return false;
			}

			return true;
		}

		protected async Task<Hashtable> getContext()
		{
			if (_context == null)
				_context = await createContext();
			return _context;
		}

		protected virtual async Task<Hashtable> createContext()
		{
			var context = new Hashtable();
			context["claims"] = Claims;
			context["roles"] = Roles;
			context["scopes"] = Scopes;
			return context;
		}
	}
}
