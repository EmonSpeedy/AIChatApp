using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AIChatApp.Application.Interfaces;
using System.Security.Claims;

namespace AIChatApp.Web.Controllers;

[Authorize]
public class ChatController : Controller
{
    private readonly IChatService _chatService;

    public ChatController(IChatService chatService)
    {
        _chatService = chatService;
    }

    public async Task<IActionResult> Index(Guid userId)
    {
        if (userId == Guid.Empty)
            return RedirectToAction("Index", "User");

        var currentUserIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var currentUserId = Guid.Parse(currentUserIdClaim);
        var chatDto = await _chatService.GetChatAsync(currentUserId, userId);

        if (chatDto == null)
            return NotFound();

        return View(chatDto);
    }

    [HttpGet]
    public async Task<IActionResult> GetMessages(Guid userId, int page = 1)
    {
        var currentUserIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var currentUserId = Guid.Parse(currentUserIdClaim);
        var messages = await _chatService.GetMessagesAsync(currentUserId, userId, page);

        return Json(messages);
    }
}