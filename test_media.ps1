Add-Type -AssemblyName System.Runtime.WindowsRuntime | Out-Null

# Load the SMTC type
$null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media,ContentType=WindowsRuntime]
$null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties,Windows.Media,ContentType=WindowsRuntime]

# The proven PowerShell 5+ WinRT awaiter
function Await-Task {
    param([object]$WinRtTask, [type]$AsType)
    $asTaskMethod = [System.WindowsRuntimeSystemExtensions].GetMethods() |
        Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetParameters().Length -eq 1 } |
        Select-Object -First 1
    $gm = $asTaskMethod.MakeGenericMethod($AsType)
    $netTask = $gm.Invoke($null, @($WinRtTask))
    $netTask.Wait(5000) | Out-Null
    return $netTask.Result
}

try {
    $mgr = Await-Task `
        ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) `
        ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
    
    Write-Host "Manager OK: $($null -ne $mgr)"
    
    $session = $mgr.GetCurrentSession()
    if ($session) {
        $pb = $session.GetPlaybackInfo()
        Write-Host "Playback: $($pb.PlaybackStatus)"
        
        $mp = Await-Task ($session.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
        Write-Host "Title:  $($mp.Title)"
        Write-Host "Artist: $($mp.Artist)"
    } else {
        Write-Host "No session - play music and re-run"
    }
} catch {
    Write-Host "ERROR: $_"
}
