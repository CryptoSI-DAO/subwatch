import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  RefreshControl,
  Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import { useTheme } from '@/src/lib/theme';
import {
  type Offer,
  type Subscription,
  CATEGORIES,
  getCategoryName,
  getMonthlyCost,
  getYearlyCost,
  formatCurrency,
} from '@/src/types';

interface OfferComparison {
  offer: Offer;
  userSub?: Subscription;
  monthlySavings: number | null;
  yearlySavings: number | null;
  verdict: 'save' | 'already_cheaper' | 'no_match';
}

export default function OffersScreen() {
  const { colors } = useTheme();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      const today = new Date().toISOString().split('T')[0];

      const [offersRes, subsRes] = await Promise.all([
        supabase
          .from('offers')
          .select('*')
          .eq('is_active', true)
          .gte('end_date', today)
          .order('badge')
          .order('sort_order'),
        userId
          ? supabase
              .from('subscriptions')
              .select('*')
              .eq('user_id', userId)
              .eq('active', true)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (offersRes.data) setOffers(offersRes.data as Offer[]);
      if (subsRes.data) setSubscriptions(subsRes.data as Subscription[]);
    } catch (err) {
      console.error('Failed to load offers:', err);
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  function buildComparison(offer: Offer): OfferComparison {
    const matchingSubs = subscriptions.filter(
      (s) => Number(s.category_id) === offer.category_id
    );

    if (matchingSubs.length === 0) {
      return {
        offer,
        verdict: 'no_match',
        monthlySavings: null,
        yearlySavings: null,
      };
    }

    // Find the most expensive sub in this category for comparison
    const userSub = matchingSubs.reduce((max, s) => {
      const sMonthly = getMonthlyCost(s.price, s.billing_cycle, s.cycle_days || 30);
      const maxMonthly = getMonthlyCost(max.price, max.billing_cycle, max.cycle_days || 30);
      return sMonthly > maxMonthly ? s : max;
    });

    const userMonthly = getMonthlyCost(userSub.price, userSub.billing_cycle, userSub.cycle_days || 30);
    const offerMonthly = offer.offer_price; // offers are always monthly
    const monthlySavings = userMonthly - offerMonthly;
    const yearlySavings = monthlySavings * 12;

    return {
      offer,
      userSub,
      monthlySavings,
      yearlySavings,
      verdict: monthlySavings > 0 ? 'save' : 'already_cheaper',
    };
  }

  const weeklyOffers = offers.filter((o) => o.badge === 'weekly').map(buildComparison);
  const monthlyOffers = offers.filter((o) => o.badge === 'monthly').map(buildComparison);
  const totalPotentialSavings = [...weeklyOffers, ...monthlyOffers]
    .filter((c) => c.verdict === 'save')
    .reduce((sum, c) => sum + (c.yearlySavings || 0), 0);

  function renderOfferCard(comp: OfferComparison, key: string) {
    const { offer, userSub, verdict, monthlySavings, yearlySavings } = comp;
    const discountPct = offer.normal_price > 0
      ? Math.round((1 - offer.offer_price / offer.normal_price) * 100)
      : 100;

    return (
      <Pressable
        key={key}
        style={[styles.offerCard, { backgroundColor: colors.surface }]}
        onPress={() => offer.referral_url && Linking.openURL(offer.referral_url)}
      >
        {/* Top row: icon + name + discount badge */}
        <View style={styles.offerHeader}>
          <View style={[styles.offerIconWrap, { backgroundColor: offer.color + '20' }]}>
            <Text style={styles.offerIcon}>{offer.icon}</Text>
          </View>
          <View style={styles.offerNameWrap}>
            <Text style={[styles.offerProvider, { color: colors.text }]}>{offer.provider}</Text>
            <Text style={[styles.offerCategory, { color: colors.textSecondary }]}>
              {getCategoryName(offer.category_id)}
            </Text>
          </View>
          {discountPct > 0 && (
            <View style={[styles.discountBadge, { backgroundColor: '#34C759' }]}>
              <Text style={styles.discountBadgeText}>-{discountPct}%</Text>
            </View>
          )}
        </View>

        {/* Description */}
        {offer.description ? (
          <Text style={[styles.offerDesc, { color: colors.textSecondary }]}>
            {offer.description}
          </Text>
        ) : null}

        {/* Price comparison */}
        <View style={styles.priceRow}>
          {offer.normal_price > offer.offer_price && (
            <Text style={[styles.oldPrice, { color: colors.textSecondary }]}>
              {formatCurrency(offer.normal_price, offer.currency)}/mo
            </Text>
          )}
          <Text style={[styles.offerPrice, { color: offer.color }]}>
            {offer.offer_price === 0 ? 'FREE' : `${formatCurrency(offer.offer_price, offer.currency)}/mo`}
          </Text>
        </View>

        {/* Smart comparison banner */}
        {verdict === 'save' && userSub && (
          <View style={[styles.comparisonBanner, { backgroundColor: '#34C759' + '15' }]}>
            <Text style={[styles.comparisonText, { color: '#248A3D' }]}>
              💰 Switch from {userSub.name} — save{' '}
              {formatCurrency(Math.abs(yearlySavings || 0), offer.currency)}/yr
            </Text>
          </View>
        )}
        {verdict === 'already_cheaper' && userSub && (
          <View style={[styles.comparisonBanner, { backgroundColor: colors.primary + '15' }]}>
            <Text style={[styles.comparisonText, { color: colors.primary }]}>
              💪 You're already saving with {userSub.name}!{' '}
              {monthlySavings !== null && monthlySavings < 0
                ? `(${formatCurrency(Math.abs(monthlySavings))}/mo cheaper)`
                : ''}
            </Text>
          </View>
        )}
        {verdict === 'no_match' && (
          <View style={[styles.comparisonBanner, { backgroundColor: colors.border }]}>
            <Text style={[styles.comparisonText, { color: colors.textSecondary }]}>
              ✨ New to {getCategoryName(offer.category_id)}? Give it a try!
            </Text>
          </View>
        )}

        {/* CTA */}
        {offer.referral_url && (
          <View style={styles.ctaRow}>
            <Text style={[styles.ctaText, { color: offer.color }]}>
              {verdict === 'save' ? 'Switch & Save →' : 'Try it →'}
            </Text>
          </View>
        )}
      </Pressable>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={loadData} tintColor={colors.primary} />
      }
    >
      {/* Savings summary */}
      {totalPotentialSavings > 0 && (
        <View style={[styles.summaryCard, { backgroundColor: '#34C759' }]}>
          <Text style={styles.summaryLabel}>Potential Yearly Savings</Text>
          <Text style={styles.summaryAmount}>
            {formatCurrency(totalPotentialSavings)}
          </Text>
          <Text style={styles.summarySubtext}>
            Switch to these offers and keep more in your pocket 💰
          </Text>
        </View>
      )}

      {/* Weekly offers */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>🔥 Deals of the Week</Text>
          <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
            Refreshes every Monday
          </Text>
        </View>
        {weeklyOffers.length === 0 && !loading ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No weekly deals right now — check back Monday!
          </Text>
        ) : (
          weeklyOffers.map((comp, i) => renderOfferCard(comp, `weekly-${i}`))
        )}
      </View>

      {/* Monthly offers */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>📅 Deals of the Month</Text>
          <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
            Valid all month long
          </Text>
        </View>
        {monthlyOffers.length === 0 && !loading ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No monthly deals right now.
          </Text>
        ) : (
          monthlyOffers.map((comp, i) => renderOfferCard(comp, `monthly-${i}`))
        )}
      </View>

      {/* Disclaimer */}
      <Text style={[styles.disclaimer, { color: colors.textSecondary }]}>
        Offers are curated and may be affiliate links — SubWatch may earn a small commission at no cost to you. Always verify pricing on the provider's site.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  summaryCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 4,
  },
  summaryLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '500' },
  summaryAmount: { color: '#fff', fontSize: 42, fontWeight: '800', letterSpacing: -1 },
  summarySubtext: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4, textAlign: 'center' },
  section: { gap: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 4 },
  sectionTitle: { fontSize: 20, fontWeight: '700' },
  sectionSub: { fontSize: 13 },
  emptyText: { fontSize: 14, paddingVertical: 20, textAlign: 'center' },
  offerCard: {
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  offerHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  offerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  offerIcon: { fontSize: 26 },
  offerNameWrap: { flex: 1 },
  offerProvider: { fontSize: 18, fontWeight: '700' },
  offerCategory: { fontSize: 13, marginTop: 2 },
  discountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountBadgeText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  offerDesc: { fontSize: 14, lineHeight: 19 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  oldPrice: { fontSize: 15, textDecorationLine: 'line-through' },
  offerPrice: { fontSize: 24, fontWeight: '800' },
  comparisonBanner: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  comparisonText: { fontSize: 14, fontWeight: '600' },
  ctaRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  ctaText: { fontSize: 15, fontWeight: '700' },
  disclaimer: { fontSize: 12, textAlign: 'center', lineHeight: 16, marginTop: 8 },
});
