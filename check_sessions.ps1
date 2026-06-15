Add-Type -AssemblyName System.Runtime.WindowsRuntime | Out-Null
[void][Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media,ContentType=WindowsRuntime]
[void][Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties,Windows.Media,ContentType=WindowsRuntime]

function Await-Task {
  param([object]$WinRtTask, [type]$AsType)
  $m = [System.WindowsRuntimeSystemExtensions].GetMethods() |
    Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetParameters().Length -eq 1 } |
    Select-Object -First 1
  $gm = $m.MakeGenericMethod($AsType)
  $t = $gm.Invoke($null, @($WinRtTask))
  $t.Wait(5000) | Out-Null
  return $t.Result
}

try {
  $mgr = Await-Task `
    ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) `
    ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
  if ($null -eq $mgr) {
    Write-Host "Manager is null"
    exit
  }

  $sessions = $mgr.GetSessions()
  Write-Host "Sessions count: $($sessions.Count)"
  
  $idx = 0
  foreach ($s in $sessions) {
    $pb = $s.GetPlaybackInfo()
    Write-Host "[$idx] App: $($s.SourceAppUserModelId)"
    Write-Host "    Status: $($pb.PlaybackStatus)"
    Write-Host "    Controls: PlayEnabled=$($pb.Controls.IsPlayEnabled), PauseEnabled=$($pb.Controls.IsPauseEnabled)"
    try {
      $mp = Await-Task ($s.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
      Write-Host "    Media: Title='$($mp.Title)', Artist='$($mp.Artist)'"
    } catch {
      Write-Host "    Media properties fetch failed: $_"
    }
    $idx++
  }
} catch {
  Write-Host "ERROR: $_"
}
