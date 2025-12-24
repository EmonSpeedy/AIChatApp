namespace AIChatApp.Domain.Models;

public class ChatConversationSummary
{
    public Guid UserId { get; set; }
    public string FullName { get; set; }
    public string? ProfileImageUrl { get; set; }
    public string? LastMessage { get; set; }
    public DateTime LastMessageAt { get; set; }
    public int UnreadCount { get; set; }
}