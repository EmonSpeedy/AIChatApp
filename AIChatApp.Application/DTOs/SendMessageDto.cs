namespace AIChatApp.Application.DTOs;

public class SendMessageDto
{
    public Guid ReceiverId { get; set; }
    public string MessageContent { get; set; }
}