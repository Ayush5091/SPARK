import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:spark_flutter/main.dart';

void main() {
  testWidgets('SPARK app loads test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const ProviderScope(child: SparkApp()));
    
    // We can't really test much without the router being fully set up with mock pages
    // but this ensures the basic widget tree builds.
    expect(find.byType(SparkApp), findsOneWidget);
  });
}
