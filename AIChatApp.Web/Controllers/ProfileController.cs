using AIChatApp.Application.Common;
using AIChatApp.Application.DTOs;
using AIChatApp.Application.Interfaces;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace AIChatApp.Web.Controllers;

[Authorize]
public class ProfileController : Controller
{
    private readonly IProfileService _profileService;

    public ProfileController(IProfileService profileService) => _profileService = profileService;

    private Guid GetCurrentUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<IActionResult> ProfileDetails()
    {
        var result = await _profileService.GetProfileDetailsAsync(GetCurrentUserId());
        return result.IsSuccess ? View(result.Data) : NotFound();
    }

    [HttpGet]
    public async Task<IActionResult> EditProfile()
    {
        var result = await _profileService.GetEditProfileModelAsync(GetCurrentUserId());

        // সার্ভিস যদি সাকসেস হয় তবে ভিউ দেখাবে, নাহলে ৪‌০৪
        return result.IsSuccess ? View(result.Data) : NotFound();
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> EditProfile(EditProfileDto model)
    {
        // ১. বেসিক ভ্যালিডেশন চেক
        if (!ModelState.IsValid) return View(model);

        // ২. সার্ভিসে রিকোয়েস্ট পাঠানো
        var result = await _profileService.UpdateProfileAsync(GetCurrentUserId(), model);

        if (result.IsSuccess)
        {
            // ৩. আইডেন্টিটি রিফ্রেশ (নতুন নাম/ইউজারনেম কুকিতে সেভ করা)
            await HttpContext.SignInAsync("CookieAuth", (ClaimsPrincipal)result.Data!);

            TempData["SuccessMessage"] = result.Message;
            return RedirectToAction(nameof(ProfileDetails));
        }

        // ৪. যদি ফেল করে (যেমন ইউজারনেম নেওয়া হয়ে গেছে)
        ModelState.AddModelError("", result.Message);
        return View(model);
    }

    [HttpGet]
    public async Task<IActionResult> ChangeProfilePicture()
    {
        var result = await _profileService.GetUpdateProfilePictureModelAsync(GetCurrentUserId());
        return result.IsSuccess ? View(result.Data) : NotFound();
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> ChangeProfilePicture(UpdateProfilePictureDto model)
    {
        if (model.ProfileImageFile == null) return RedirectToAction(nameof(ProfileDetails));

        var result = await _profileService.UpdateProfilePictureAsync(GetCurrentUserId(), model.ProfileImageFile);
        if (result.IsSuccess) TempData["SuccessMessage"] = result.Message;
        else TempData["ErrorMessage"] = result.Message;

        return RedirectToAction(nameof(ProfileDetails));
    }

    [HttpGet] public IActionResult ConfirmDelete() => View(new DeleteAccountDto());

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> DeleteAccount(DeleteAccountDto model)
    {
        var result = await _profileService.DeleteAccountAsync(GetCurrentUserId(), model.Password);

        if (result.IsSuccess)
        {
            await HttpContext.SignOutAsync("CookieAuth");
            TempData["SuccessMessage"] = result.Message;
            return RedirectToAction("Index", "Home");
        }

        ModelState.AddModelError("Password", result.Message);
        return View("ConfirmDelete", model);
    }

    [HttpGet] public IActionResult ChangePassword() => View(new ChangePasswordDto());

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> ChangePassword(ChangePasswordDto model)
    {
        if (!ModelState.IsValid) return View(model);

        var result = await _profileService.ChangePasswordAsync(GetCurrentUserId(), model);
        if (result.IsSuccess)
        {
            TempData["SuccessMessage"] = result.Message;
            return RedirectToAction(nameof(ProfileDetails));
        }

        ModelState.AddModelError("CurrentPassword", result.Message);
        return View(model);
    }
}