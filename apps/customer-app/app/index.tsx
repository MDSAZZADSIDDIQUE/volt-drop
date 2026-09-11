import { useGetHealth } from '@voltdrop/api-client';
import { Text, View } from 'react-native';

// M0 placeholder: proves the app builds, styles with NativeWind and reaches the API.
export default function Home() {
  const health = useGetHealth();
  let status = 'Checking the API…';
  if (health.isSuccess) {
    status = 'The API is up';
  } else if (health.isError) {
    status = "Can't reach the API";
  }
  return (
    <View className="flex-1 items-center justify-center bg-white p-6">
      <Text className="text-2xl font-bold">VoltDrop</Text>
      <Text className="mt-2 text-base">{status}</Text>
    </View>
  );
}
