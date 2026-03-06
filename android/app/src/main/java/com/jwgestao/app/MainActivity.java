package com.jwgestao.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;

import androidx.core.app.NotificationCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    public static class LocationTrackingForegroundService extends Service {
        public static final String CHANNEL_ID = "jwgestao_location_tracking";
        public static final int NOTIFICATION_ID = 2206;

        @Override
        public void onCreate() {
            super.onCreate();
            createNotificationChannel();
            startForeground(NOTIFICATION_ID, buildNotification());
        }

        @Override
        public int onStartCommand(Intent intent, int flags, int startId) {
            return START_STICKY;
        }

        @Override
        public void onDestroy() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                stopForeground(STOP_FOREGROUND_REMOVE);
            } else {
                stopForeground(true);
            }
            super.onDestroy();
        }

        @Override
        public IBinder onBind(Intent intent) {
            return null;
        }

        private void createNotificationChannel() {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
                return;
            }

            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Rastreamento de Localização",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Canal usado para rastreamento contínuo de localização.");

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }

        private Notification buildNotification() {
            return new NotificationCompat.Builder(this, CHANNEL_ID)
                    .setContentTitle("JWGestao")
                    .setContentText("Rastreamento de localização ativo")
                    .setSmallIcon(R.mipmap.ic_launcher)
                    .setOngoing(true)
                    .setOnlyAlertOnce(true)
                    .build();
        }
    }
}
