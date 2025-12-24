using AIChatApp.Application.Common;
using AIChatApp.Application.DTOs;
using AIChatApp.Application.Interfaces;
using AIChatApp.Domain.Interfaces;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;

namespace AIChatApp.Application.Services;

public class ProfileService : IProfileService
{
    private readonly IUserRepository _userRepository;
    private readonly IFileStorageService _fileStorageService;
    private readonly IAuthService _authService;

    public ProfileService(IUserRepository userRepository,
                          IFileStorageService fileStorageService,
                          IAuthService authService)
    {
        _userRepository = userRepository;
        _fileStorageService = fileStorageService;
        _authService = authService;
    }

    // AIChatApp.Application/Services/ProfileService.cs
    public async Task<ServiceResult> GetEditProfileModelAsync(Guid userId)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null) return ServiceResult.Failure("User not found.");

        // কন্ট্রোলারের জন্য মডেল তৈরি করে পাঠানো হচ্ছে
        var model = new EditProfileDto
        {
            UserId = user.Id,
            FullName = user.FullName,
            UserName = user.UserName,
            CurrentEmail = user.Email
        };

        return ServiceResult.Success(data: model);
    }

    public async Task<ServiceResult> UpdateProfileAsync(Guid userId, EditProfileDto model)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null) return ServiceResult.Failure("User not found.");

        // ইউজারনেম অলরেডি আছে কি না চেক
        var existingUser = await _userRepository.GetByUsernameAsync(model.UserName);
        if (existingUser != null && existingUser.Id != userId)
            return ServiceResult.Failure("This username is already taken.");

        // আপডেট লজিক
        user.FullName = model.FullName;
        user.UserName = model.UserName;

        await _userRepository.UpdateAsync(user);
        await _userRepository.SaveChangesAsync();

        // নতুন আইডেন্টিটি তৈরি করে পাঠানো যাতে কন্ট্রোলার কুকি রিফ্রেশ করতে পারে
        var principal = CreatePrincipal(user);
        return ServiceResult.Success("Profile updated successfully.", principal);
    }

    public async Task<ServiceResult> GetUpdateProfilePictureModelAsync(Guid userId)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null) return ServiceResult.Failure("User not found.");

        var model = new UpdateProfilePictureDto
        {
            UserId = user.Id,
            CurrentProfilePictureUrl = user.ProfileImageUrl
        };
        return ServiceResult.Success(data: model);
    }

    public async Task<ServiceResult> GetProfileDetailsAsync(Guid userId)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null) return ServiceResult.Failure("User not found.");

        var dto = new ProfileDetailsDto
        {
            ProfileImageUrl = user.ProfileImageUrl,
            FullName = user.FullName,
            UserName = user.UserName,
            Email = user.Email,
            RegisteredDate = user.CreatedAt,
            IsVerified = user.IsVerified
        };

        return ServiceResult.Success(data: dto);
    }

    public async Task<ServiceResult> UpdateProfilePictureAsync(Guid userId, IFormFile imageFile)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null) return ServiceResult.Failure("User not found.");

        try
        {
            string oldImageUrl = user.ProfileImageUrl!;
            string newImageUrl = await _fileStorageService.SaveFileAsync(imageFile);

            user.ProfileImageUrl = newImageUrl;
            await _userRepository.UpdateAsync(user);
            await _userRepository.SaveChangesAsync();

            // Cleanup old file from Cloudinary (Except default)
            if (!string.IsNullOrEmpty(oldImageUrl) && !oldImageUrl.Contains("default.png"))
            {
                await _fileStorageService.DeleteFileAsync(oldImageUrl);
            }

            return ServiceResult.Success("Profile picture updated successfully.");
        }
        catch (Exception ex)
        {
            return ServiceResult.Failure($"Upload failed: {ex.Message}");
        }
    }

    public async Task<ServiceResult> DeleteAccountAsync(Guid userId, string password)
    {
        bool isPasswordCorrect = await _authService.VerifyPasswordAsync(userId, password);
        if (!isPasswordCorrect) return ServiceResult.Failure("Incorrect password. Account deletion failed.");

        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null) return ServiceResult.Failure("User not found.");

        await _userRepository.DeleteAsync(user);
        await _userRepository.SaveChangesAsync();

        return ServiceResult.Success("Account deleted successfully.");
    }

    public async Task<ServiceResult> ChangePasswordAsync(Guid userId, ChangePasswordDto model)
    {
        // Reusing existing AuthService logic
        return await _authService.ChangePasswordAsync(userId, model);
    }

    private ClaimsPrincipal CreatePrincipal(AIChatApp.Domain.Entities.User user)
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.FullName)
        };
        return new ClaimsPrincipal(new ClaimsIdentity(claims, "CookieAuth"));
    }
}