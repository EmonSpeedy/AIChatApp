using AIChatApp.Application.Common;
using AIChatApp.Application.DTOs;
using Microsoft.AspNetCore.Http;

namespace AIChatApp.Application.Interfaces;

public interface IProfileService
{
    Task<ServiceResult> GetProfileDetailsAsync(Guid userId);
    Task<ServiceResult> UpdateProfileAsync(Guid userId, EditProfileDto model);
    Task<ServiceResult> UpdateProfilePictureAsync(Guid userId, IFormFile imageFile);
    Task<ServiceResult> DeleteAccountAsync(Guid userId, string password);
    Task<ServiceResult> ChangePasswordAsync(Guid userId, ChangePasswordDto model);
    Task<ServiceResult> GetEditProfileModelAsync(Guid userId); 
    Task<ServiceResult> GetUpdateProfilePictureModelAsync(Guid userId); 
}