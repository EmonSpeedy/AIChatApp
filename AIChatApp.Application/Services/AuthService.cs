using AIChatApp.Application.Common;
using AIChatApp.Application.DTOs;
using AIChatApp.Application.Interfaces;
using AIChatApp.Domain.Entities;
using AIChatApp.Domain.Interfaces;
using System.Security.Claims;
using System.Security.Cryptography;

namespace AIChatApp.Application.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IEmailService _emailService;
    private readonly IPasswordHasher _passwordHasher;

    public AuthService(IUserRepository userRepository, IEmailService emailService, IPasswordHasher passwordHasher)
    {
        _userRepository = userRepository;
        _emailService = emailService;
        _passwordHasher = passwordHasher;
    }

    public async Task<ServiceResult> RegisterUserAsync(RegisterDto request, string baseUrl)
    {
        var existingUser = await _userRepository.GetByEmailAsync(request.Email);
        if (existingUser != null) return ServiceResult.Failure("Email already registered.");

        var user = new User
        {
            FullName = request.FullName,
            UserName = request.UserName,
            Email = request.Email,
            PasswordHash = _passwordHasher.HashPassword(request.Password),
            VerificationToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(64)),
            ProfileImageUrl = "default.png"
        };

        await _userRepository.AddAsync(user);
        await _userRepository.SaveChangesAsync();

        string verifyLink = $"{baseUrl}/Auth/Verify?token={user.VerificationToken}";
        await _emailService.SendVerificationEmailAsync(user.Email, verifyLink);

        return ServiceResult.Success("Registration successful. Please check your email.");
    }

    public async Task<ServiceResult> LoginUserAsync(LoginDto request)
    {
        var user = await _userRepository.GetByEmailAsync(request.Email);
        if (user == null || !_passwordHasher.VerifyPassword(user.PasswordHash, request.Password))
            return ServiceResult.Failure("Invalid email or password.");

        if (!user.IsVerified)
            return ServiceResult.Failure("Email not verified. Please check your inbox.");

        // Create Claims for Identity
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.FullName)
        };

        var identity = new ClaimsIdentity(claims, "CookieAuth");
        var principal = new ClaimsPrincipal(identity);

        return ServiceResult.Success("Login successful", principal);
    }

    public async Task<ServiceResult> VerifyEmailAsync(string token)
    {
        var user = await _userRepository.GetByTokenAsync(token);
        if (user == null) return ServiceResult.Failure("Invalid verification link.");

        user.VerifiedAt = DateTime.UtcNow;
        user.VerificationToken = null;
        await _userRepository.SaveChangesAsync();

        return ServiceResult.Success("Email verified successfully.");
    }

    public async Task<ServiceResult> ForgotPasswordAsync(ForgotPasswordDto request, string baseUrl)
    {
        var user = await _userRepository.GetByEmailAsync(request.Email);

        // Security: Always return success even if user doesn't exist
        if (user != null)
        {
            user.PasswordResetToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(64));
            user.ResetTokenExpires = DateTime.UtcNow.AddHours(1);
            await _userRepository.SaveChangesAsync();

            string resetLink = $"{baseUrl}/Auth/ResetPassword?token={user.PasswordResetToken}&email={Uri.EscapeDataString(user.Email)}";
            await _emailService.SendPasswordResetEmailAsync(user.Email, resetLink);
        }

        return ServiceResult.Success("If an account exists, a reset link has been sent.");
    }

    public async Task<ServiceResult> ResetPasswordAsync(ResetPasswordDto request)
    {
        if (!await ValidateResetTokenAsync(request.Email, request.Token))
            return ServiceResult.Failure("Invalid or expired reset link.");

        var user = await _userRepository.GetByEmailAsync(request.Email);
        if (user == null) return ServiceResult.Failure("User not found.");

        user.PasswordHash = _passwordHasher.HashPassword(request.NewPassword);
        user.PasswordResetToken = null;
        user.ResetTokenExpires = null;
        await _userRepository.SaveChangesAsync();

        return ServiceResult.Success("Password successfully reset.");
    }

    public async Task<bool> ValidateResetTokenAsync(string email, string token)
    {
        var user = await _userRepository.GetByEmailAsync(email);
        return user != null && user.PasswordResetToken == token && user.ResetTokenExpires > DateTime.UtcNow;
    }

    public async Task<ServiceResult> ChangePasswordAsync(Guid userId, ChangePasswordDto dto)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null) return ServiceResult.Failure("User not found.");

        if (!_passwordHasher.VerifyPassword(user.PasswordHash, dto.CurrentPassword))
            return ServiceResult.Failure("Incorrect current password.");

        user.PasswordHash = _passwordHasher.HashPassword(dto.NewPassword);
        await _userRepository.SaveChangesAsync();

        return ServiceResult.Success("Password changed successfully.");
    }

    public async Task<bool> VerifyPasswordAsync(Guid userId, string password)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null) return false;

        return _passwordHasher.VerifyPassword(user.PasswordHash, password);
    }
}