// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
use std::time::Duration;
use serde::Serialize;
use battery::Manager as BatteryManager;
use windows_sys::Win32::UI::Input::KeyboardAndMouse::{GetAsyncKeyState, VK_VOLUME_UP, VK_VOLUME_DOWN, VK_VOLUME_MUTE, VK_MEDIA_PLAY_PAUSE, VK_MEDIA_NEXT_TRACK, VK_MEDIA_PREV_TRACK};

#[derive(Clone, Serialize)]
struct BatteryPayload {
    percentage: f32,
    is_charging: bool,
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let app_handle = app.handle();
            let window = app.get_window("main").unwrap();
            
            // Auto-center the window to the top edge of any laptop screen
            if let Ok(Some(monitor)) = window.primary_monitor() {
                let screen_size = monitor.size();
                let window_size = window.outer_size().unwrap();
                let center_x = (screen_size.width as i32 / 2) - (window_size.width as i32 / 2);
                window.set_position(tauri::Position::Physical(tauri::PhysicalPosition { x: center_x, y: 0 })).unwrap();
            }
            
            // Background thread to monitor the battery
            let battery_handle = app_handle.clone();
            std::thread::spawn(move || {
                let battery_manager = BatteryManager::new().ok();
                
                loop {
                    let mut percentage = 100.0;
                    let mut is_charging = false;

                    if let Some(bm) = &battery_manager {
                        if let Ok(mut batteries) = bm.batteries() {
                            if let Some(Ok(battery)) = batteries.next() {
                                percentage = battery.state_of_charge().value * 100.0;
                                is_charging = battery.state() == battery::State::Charging;
                            }
                        }
                    }

                    let payload = BatteryPayload {
                        percentage,
                        is_charging,
                    };

                    battery_handle.emit_all("battery-stats", payload).unwrap_or(());
                    std::thread::sleep(Duration::from_secs(1));
                }
            });

            // Background thread to monitor global media keys
            let media_handle = app_handle.clone();
            std::thread::spawn(move || {
                let mut was_up = false;
                let mut was_down = false;
                let mut was_mute = false;
                let mut was_play = false;
                let mut was_next = false;
                let mut was_prev = false;

                loop {
                    unsafe {
                        let up = (GetAsyncKeyState(VK_VOLUME_UP.into()) & -32768) != 0;
                        let down = (GetAsyncKeyState(VK_VOLUME_DOWN.into()) & -32768) != 0;
                        let mute = (GetAsyncKeyState(VK_VOLUME_MUTE.into()) & -32768) != 0;
                        let play = (GetAsyncKeyState(VK_MEDIA_PLAY_PAUSE.into()) & -32768) != 0;
                        let next = (GetAsyncKeyState(VK_MEDIA_NEXT_TRACK.into()) & -32768) != 0;
                        let prev = (GetAsyncKeyState(VK_MEDIA_PREV_TRACK.into()) & -32768) != 0;

                        if up && !was_up { media_handle.emit_all("media-key", "volume-up").unwrap_or(()); }
                        if down && !was_down { media_handle.emit_all("media-key", "volume-down").unwrap_or(()); }
                        if mute && !was_mute { media_handle.emit_all("media-key", "volume-mute").unwrap_or(()); }
                        if play && !was_play { media_handle.emit_all("media-key", "play-pause").unwrap_or(()); }
                        if next && !was_next { media_handle.emit_all("media-key", "next-track").unwrap_or(()); }
                        if prev && !was_prev { media_handle.emit_all("media-key", "prev-track").unwrap_or(()); }

                        was_up = up;
                        was_down = down;
                        was_mute = mute;
                        was_play = play;
                        was_next = next;
                        was_prev = prev;
                    }
                    std::thread::sleep(Duration::from_millis(50));
                }
            });
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
