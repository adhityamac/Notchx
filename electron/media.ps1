Add-Type -AssemblyName System.Runtime.WindowsRuntime
Add-Type -TypeDefinition @"
using System;
using System.Threading.Tasks;
using Windows.Media.Control;

public class MediaHelper {
    public static string GetMedia() {
        try {
            var t = GlobalSystemMediaTransportControlsSessionManager.RequestAsync().AsTask();
            t.Wait();
            var mgr = t.Result;
            var session = mgr.GetCurrentSession();
            if (session == null) return "null";
            var pt = session.TryGetMediaPropertiesAsync().AsTask();
            pt.Wait();
            var props = pt.Result;
            var pb = session.GetPlaybackInfo();
            return "{\"Title\":\"" + props.Title + "\",\"Artist\":\"" + props.Artist + "\",\"Status\":\"" + pb.PlaybackStatus + "\"}";
        } catch(Exception e) {
            return "{\"error\":\"" + e.Message + "\"}";
        }
    }
    public static string PlayPause() {
        try {
            var t = GlobalSystemMediaTransportControlsSessionManager.RequestAsync().AsTask();
            t.Wait();
            var mgr = t.Result;
            var session = mgr.GetCurrentSession();
            if (session == null) return "null";
            var res = session.TryTogglePlayPauseAsync().AsTask();
            res.Wait();
            return "ok";
        } catch(Exception e) {
            return "error: " + e.Message;
        }
    }
    public static string SkipNext() {
        try {
            var t = GlobalSystemMediaTransportControlsSessionManager.RequestAsync().AsTask();
            t.Wait();
            var mgr = t.Result;
            var session = mgr.GetCurrentSession();
            if (session == null) return "null";
            var res = session.TrySkipNextAsync().AsTask();
            res.Wait();
            return "ok";
        } catch(Exception e) {
            return "error: " + e.Message;
        }
    }
    public static string SkipPrev() {
        try {
            var t = GlobalSystemMediaTransportControlsSessionManager.RequestAsync().AsTask();
            t.Wait();
            var mgr = t.Result;
            var session = mgr.GetCurrentSession();
            if (session == null) return "null";
            var res = session.TrySkipPreviousAsync().AsTask();
            res.Wait();
            return "ok";
        } catch(Exception e) {
            return "error: " + e.Message;
        }
    }
}
"@

if ($args[0] -eq "playpause") {
    [MediaHelper]::PlayPause()
} elseif ($args[0] -eq "next") {
    [MediaHelper]::SkipNext()
} elseif ($args[0] -eq "prev") {
    [MediaHelper]::SkipPrev()
} else {
    [MediaHelper]::GetMedia()
}
