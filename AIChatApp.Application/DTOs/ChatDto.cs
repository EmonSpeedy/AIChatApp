namespace AIChatApp.Application.DTOs;

public class ChatDto
{
    public Guid CurrentUserId { get; set; }
    public Guid ChatUserId { get; set; }
    public string ChatUserName { get; set; }
    public string ChatUserFullName { get; set; } // ADD THIS
    public string ChatUserProfileImage { get; set; }
    public List<MessageDto> Messages { get; set; }
}