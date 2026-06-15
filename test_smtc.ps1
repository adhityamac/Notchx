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
  if ($null -eq $mgr) { throw 'Manager null' }
} catch {
  Write-Host '[[MEDIA_START]]null[[MEDIA_END]]'
  Write-Error "SMTC init failed: $_"
  exit 1
}

$session = $mgr.GetCurrentSession()
if (-not $session) {
  $sessions = $mgr.GetSessions()
  $session = $sessions | Where-Object { $_.GetPlaybackInfo().PlaybackStatus -eq 'Playing' } | Select-Object -First 1
  if (-not $session) {
    $session = $sessions | Select-Object -First 1
  }
}

if ($session) {
  $pb  = $session.GetPlaybackInfo()
  $tl  = $session.GetTimelineProperties()
  $mp  = Await-Task ($session.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
  if ($null -eq $mp) {
    Write-Host '[[MEDIA_START]]null[[MEDIA_END]]'
  } else {
    $status = try { $pb.PlaybackStatus.ToString() } catch { 'Unknown' }
    $obj = @{
      title          = if ($mp.Title)  { $mp.Title }  else { '' }
      artist         = if ($mp.Artist) { $mp.Artist } else { '' }
      album          = if ($mp.AlbumTitle) { $mp.AlbumTitle } else { '' }
      playbackStatus = $status
      repeatMode     = if ($pb.AutoRepeatMode -ne $null) { $pb.AutoRepeatMode.ToString() } else { 'None' }
      isShuffle      = [bool]$pb.IsShuffleActive
      position       = [math]::Round($tl.Position.TotalSeconds, 1)
      duration       = [math]::Round($tl.EndTime.TotalSeconds, 1)
    }
    $obj | ConvertTo-Json -Compress
  }
} else {
  Write-Host '[[MEDIA_START]]null[[MEDIA_END]]'
}
