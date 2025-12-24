using AIChatApp.Application.DTOs;
using AIChatApp.Application.Interfaces;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace AIChatApp.Web.Controllers;

public class AuthController : Controller
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService) => _authService = authService;

    [HttpGet] public IActionResult Register() => View();

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Register(RegisterDto model)
    {
        if (!ModelState.IsValid) return View(model);

        var result = await _authService.RegisterUserAsync(model, GetBaseUrl());

        if (result.IsSuccess) return RedirectToAction("RegisterSuccess");

        ModelState.AddModelError("", result.Message);
        return View(model);
    }

    [HttpGet] public IActionResult Login() => View();

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Login(LoginDto model, string? returnUrl = null)
    {
        if (User.Identity!.IsAuthenticated) return RedirectToAction("Index", "Home");
        if (!ModelState.IsValid) return View(model);

        var result = await _authService.LoginUserAsync(model);

        if (!result.IsSuccess)
        {
            ModelState.AddModelError("", result.Message);
            return View(model);
        }

        // Authentication Process
        var principal = (ClaimsPrincipal)result.Data!;
        await HttpContext.SignInAsync("CookieAuth", principal, new AuthenticationProperties { IsPersistent = true });

        TempData["SuccessMessage"] = result.Message;
        return LocalRedirect(returnUrl ?? "/Home/Index");
    }

    [HttpGet]
    public async Task<IActionResult> Verify(string token)
    {
        var result = await _authService.VerifyEmailAsync(token);
        if (result.IsSuccess)
        {
            TempData["SuccessMessage"] = result.Message;
            return View("VerifySuccess");
        }
        TempData["ErrorMessage"] = result.Message;
        return View("VerifyError");
    }

    [HttpGet] public IActionResult ForgotPassword() => View();

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordDto model)
    {
        if (!ModelState.IsValid) return View(model);

        var result = await _authService.ForgotPasswordAsync(model, GetBaseUrl());
        TempData["SuccessMessage"] = result.Message;
        return RedirectToAction("ForgotPasswordSuccess");
    }

    [HttpGet]
    public async Task<IActionResult> ResetPassword(string token, string email)
    {
        if (string.IsNullOrEmpty(token) || string.IsNullOrEmpty(email) || !await _authService.ValidateResetTokenAsync(email, token))
        {
            TempData["ErrorMessage"] = "Invalid or expired reset link.";
            return RedirectToAction("Login");
        }

        return View(new ResetPasswordDto { Token = token, Email = email });
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> ResetPassword(ResetPasswordDto model)
    {
        if (!ModelState.IsValid) return View(model);

        var result = await _authService.ResetPasswordAsync(model);
        if (result.IsSuccess)
        {
            TempData["SuccessMessage"] = result.Message;
            return RedirectToAction("ResetPasswordSuccess");
        }

        ModelState.AddModelError("", result.Message);
        return View(model);
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync("CookieAuth");
        TempData["SuccessMessage"] = "Logged out successfully.";
        return RedirectToAction("Index", "Home");
    }

    // Success Pages
    [HttpGet] public IActionResult RegisterSuccess() => View();
    [HttpGet] public IActionResult ForgotPasswordSuccess() => View();
    [HttpGet] public IActionResult ResetPasswordSuccess() => View();

    // Helper to get Base URL
    private string GetBaseUrl() => $"{Request.Scheme}://{Request.Host}";
}