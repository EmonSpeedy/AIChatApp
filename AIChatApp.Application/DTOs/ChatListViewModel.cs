namespace AIChatApp.Application.DTOs;

public class ChatSummaryDto
{
    public Guid UserId { get; set; }
    public string FullName { get; set; }
    public string ProfileImageUrl { get; set; }
    public string LastMessage { get; set; }
    public DateTime LastMessageAt { get; set; }
    public int UnreadCount { get; set; }
}

public class ChatListViewModel
{
    public List<ChatSummaryDto> UnreadChats { get; set; } = new();
    public List<ChatSummaryDto> ReadChats { get; set; } = new();
}