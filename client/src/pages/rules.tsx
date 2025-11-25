import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Ban } from 'lucide-react';
import { COMMUNITY_RULES } from '@shared/schema';

export default function RulesPage() {
  return (
    <div className="container mx-auto max-w-7xl p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Community Rules & Regulations</h1>
        <p className="text-muted-foreground">
          These rules maintain a positive and respectful community environment. Breaking rules results in warning points and potential temporary or permanent bans.
        </p>
      </div>

      {/* Warning System Explanation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              Warning Points
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>Each rule violation adds warning points. Accumulating 7+ warning points results in a 3-month ban.</p>
            <p className="mt-2 text-xs italic">Appeals can be submitted for any punishment.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Ban className="w-5 h-5 text-red-500" />
              Temporary Bans
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>Temporary bans range from 2-6 months depending on the violation. You can appeal during or after your ban.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Ban className="w-5 h-5 text-purple-500" />
              Permanent Bans
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>Severe violations result in permanent bans. Ban evasion, doxxing, falsifying evidence, and inappropriate usernames are permanent.</p>
          </CardContent>
        </Card>
      </div>

      {/* Rules Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Community Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-3 px-4 font-semibold">Rule</th>
                  <th className="text-left py-3 px-4 font-semibold">Violation Points</th>
                  <th className="text-left py-3 px-4 font-semibold">Ban Duration</th>
                </tr>
              </thead>
              <tbody>
                {COMMUNITY_RULES.map((rule, idx) => (
                  <tr key={idx} className="border-b border-border/50 hover:bg-accent/50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium">{rule.category}</p>
                        <p className="text-xs text-muted-foreground mt-1">{rule.description}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {rule.permanent ? (
                        <span className="inline-flex items-center gap-1 text-red-500 font-semibold">
                          <Ban className="w-4 h-4" />
                          Permanent
                        </span>
                      ) : (
                        <span className="inline-block bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 px-2 py-1 rounded text-xs font-semibold">
                          {rule.points} points
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {rule.permanent ? (
                        <span className="text-red-500 font-semibold">Permanent Ban</span>
                      ) : (
                        <span>{rule.duration} months</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Appeals Info */}
      <Card className="mt-8 bg-blue-500/5 border-blue-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-blue-500" />
            How to Appeal a Punishment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            If you believe a punishment was unjust, you can submit an appeal explaining why the violation was false or was handled incorrectly.
          </p>
          <ul className="space-y-2 ml-4">
            <li>✓ Appeals can be submitted even if you're currently banned</li>
            <li>✓ Provide detailed reasons why the punishment should be overturned</li>
            <li>✓ Appeals are reviewed by staff members</li>
            <li>✓ False appeals may result in additional warnings</li>
          </ul>
          <p className="mt-4 font-semibold">
            Staff members can only be kicked/removed by the Owner. Staff members can also have community badges.
          </p>
        </CardContent>
      </Card>

      {/* Community Standards */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>General Community Standards</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Our community thrives on respect, positivity, and constructive conversation. While we have specific rules above, the core principle is: treat others how you'd like to be treated.
          </p>
          <ul className="space-y-2 ml-4">
            <li>✓ Be respectful and civil in all interactions</li>
            <li>✓ No harassment, bullying, or personal attacks</li>
            <li>✓ Keep discussions on-topic in designated sections</li>
            <li>✓ Report rule violations to staff—don't retaliate</li>
            <li>✓ Respect staff decisions and the appeal process</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
