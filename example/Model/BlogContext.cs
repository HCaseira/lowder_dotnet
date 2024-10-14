using Microsoft.EntityFrameworkCore;

public class BloggingContext : DbContext
{
	public DbSet<Blog> Blogs { get; set; }
	public DbSet<Post> Posts { get; set; }

	public static string DbPath { get; }

	static BloggingContext()
	{
		var folder = Environment.SpecialFolder.LocalApplicationData;
		var path = Environment.GetFolderPath(folder);
		DbPath = Path.Join(path, "blogging.db");
	}

	public Post[] ReadPosts()
	{
		return Posts
			.Where(p => p.PostId > 0)
			.ToArray();
	}

	public void RemovePosts()
	{
		var post = Posts
			.Where(p => p.PostId > 0)
			.First();
		Posts.Remove(post);
	}

	public int CountPosts()
	{
		return Posts
			.Where(p => p.PostId > 0)
			.Count();
	}

	// The following configures EF to create a Sqlite database file in the
	// special "local" folder for your platform.
	protected override void OnConfiguring(DbContextOptionsBuilder options) => options.UseSqlite($"Data Source={DbPath}");
}

public class Blog
{
	public int BlogId { get; set; }
	public string? Url { get; set; }
	public List<Post> Posts { get; } = [];
}

public class Post
{
	public int PostId { get; set; }
	public string? Title { get; set; }
	public string? Content { get; set; }
	public int BlogId { get; set; }
	public Blog? Blog { get; set; }
}