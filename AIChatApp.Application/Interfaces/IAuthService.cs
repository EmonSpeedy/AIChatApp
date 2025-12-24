using AIChatApp.Application.Common;
using AIChatApp.Application.DTOs;

namespace AIChatApp.Application.Interfaces;

public interface IAuthService
{
    Task<ServiceResult> RegisterUserAsync(RegisterDto request, string baseUrl);
    Task<ServiceResult> VerifyEmailAsync(string token);
    Task<ServiceResult> LoginUserAsync(LoginDto request);
    Task<ServiceResult> ForgotPasswordAsync(ForgotPasswordDto request, string baseUrl);
    Task<ServiceResult> ResetPasswordAsync(ResetPasswordDto request);
    Task<bool> ValidateResetTokenAsync(string email, string token);
    Task<ServiceResult> ChangePasswordAsync(Guid userId, ChangePasswordDto dto);
    Task<bool> VerifyPasswordAsync(Guid userId, string password);
}