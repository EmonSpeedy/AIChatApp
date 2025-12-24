namespace AIChatApp.Application.Common;

public class ServiceResult
{
    public bool IsSuccess { get; set; }
    public string Message { get; set; } = string.Empty;
    public object? Data { get; set; }

    public static ServiceResult Success(string message = "", object? data = null)
        => new() { IsSuccess = true, Message = message, Data = data };

    public static ServiceResult Failure(string message)
        => new() { IsSuccess = false, Message = message };
}