
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAdmin } from '@/hooks/useAdmin';
import { Users, Activity, Globe, Settings, Shield, BarChart3, Crown, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export const AdminPanel = () => {
  const { users, logs, countryStats, loading, assignRole, refreshData } = useAdmin();
  const { signOut } = useAuth();
  const [selectedTab, setSelectedTab] = useState('overview');

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading Admin Panel...</div>
      </div>
    );
  }

  const totalUsers = users.length;
  const totalLogs = logs.length;
  const adminUsers = users.filter(user => user.roles.includes('admin')).length;
  const activeCountries = countryStats.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-r from-orange-400 to-orange-600 rounded-lg">
            <Crown className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Regal Meet Admin</h1>
            <p className="text-orange-200">Platform Administration Dashboard</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <Button
            onClick={refreshData}
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
          >
            <Activity className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          
          <Button
            onClick={() => signOut()}
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-orange-500/10 backdrop-blur-lg border-orange-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-100">Total Users</CardTitle>
            <Users className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{totalUsers}</div>
            <p className="text-xs text-orange-200">Registered users</p>
          </CardContent>
        </Card>

        <Card className="bg-orange-500/10 backdrop-blur-lg border-orange-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-100">Platform Activity</CardTitle>
            <Activity className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{totalLogs}</div>
            <p className="text-xs text-orange-200">Total actions logged</p>
          </CardContent>
        </Card>

        <Card className="bg-orange-500/10 backdrop-blur-lg border-orange-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-100">Admin Users</CardTitle>
            <Shield className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{adminUsers}</div>
            <p className="text-xs text-orange-200">Administrative access</p>
          </CardContent>
        </Card>

        <Card className="bg-orange-500/10 backdrop-blur-lg border-orange-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-100">Global Reach</CardTitle>
            <Globe className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{activeCountries}</div>
            <p className="text-xs text-orange-200">Countries served</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="bg-white/10 backdrop-blur-lg border-white/20">
          <TabsTrigger value="overview" className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-100">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-100">
            <Users className="h-4 w-4 mr-2" />
            User Management
          </TabsTrigger>
          <TabsTrigger value="logs" className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-100">
            <Activity className="h-4 w-4 mr-2" />
            Activity Logs
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-100">
            <Globe className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Users className="h-5 w-5 mr-2 text-orange-400" />
                  Recent User Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {logs.slice(0, 5).map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 bg-orange-500/10 rounded-lg">
                      <div>
                        <p className="text-white text-sm">{log.action}</p>
                        <p className="text-orange-200 text-xs">
                          {log.profiles?.display_name || 'Unknown User'}
                        </p>
                      </div>
                      <Badge variant="outline" className="border-orange-400 text-orange-200">
                        {log.country || 'Unknown'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Globe className="h-5 w-5 mr-2 text-orange-400" />
                  Top Countries
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {countryStats.slice(0, 5).map((stat) => (
                    <div key={stat.country} className="flex items-center justify-between p-3 bg-orange-500/10 rounded-lg">
                      <span className="text-white text-sm">{stat.country}</span>
                      <Badge className="bg-orange-500 text-white">
                        {stat.count}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Users className="h-5 w-5 mr-2 text-orange-400" />
                User Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-white/20">
                    <TableHead className="text-orange-200">User</TableHead>
                    <TableHead className="text-orange-200">Display Name</TableHead>
                    <TableHead className="text-orange-200">Roles</TableHead>
                    <TableHead className="text-orange-200">Joined</TableHead>
                    <TableHead className="text-orange-200">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className="border-white/10">
                      <TableCell className="text-white">{user.id.slice(0, 8)}...</TableCell>
                      <TableCell className="text-white">
                        {user.profile?.display_name || 'No name set'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.roles.map((role) => (
                            <Badge 
                              key={role} 
                              className={
                                role === 'admin' 
                                  ? 'bg-red-500 text-white' 
                                  : role === 'moderator'
                                  ? 'bg-orange-500 text-white'
                                  : 'bg-blue-500 text-white'
                              }
                            >
                              {role}
                            </Badge>
                          ))}
                          {user.roles.length === 0 && (
                            <Badge variant="outline" className="border-gray-400 text-gray-300">
                              user
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-white">
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Select onValueChange={(role) => assignRole(user.id, role as any)}>
                          <SelectTrigger className="w-32 bg-white/10 border-white/20 text-white">
                            <SelectValue placeholder="Assign Role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="moderator">Moderator</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Activity className="h-5 w-5 mr-2 text-orange-400" />
                Platform Activity Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-white/20">
                    <TableHead className="text-orange-200">Timestamp</TableHead>
                    <TableHead className="text-orange-200">User</TableHead>
                    <TableHead className="text-orange-200">Action</TableHead>
                    <TableHead className="text-orange-200">Country</TableHead>
                    <TableHead className="text-orange-200">IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} className="border-white/10">
                      <TableCell className="text-white">
                        {new Date(log.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-white">
                        {log.profiles?.display_name || 'Unknown User'}
                      </TableCell>
                      <TableCell className="text-white">{log.action}</TableCell>
                      <TableCell className="text-white">{log.country || 'N/A'}</TableCell>
                      <TableCell className="text-white">{log.ip_address || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Globe className="h-5 w-5 mr-2 text-orange-400" />
                  Country Usage Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {countryStats.map((stat, index) => (
                    <div key={stat.country} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-white text-sm">{stat.country}</span>
                        <span className="text-orange-200 text-sm">{stat.count} activities</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-orange-400 to-orange-600 h-2 rounded-full"
                          style={{
                            width: `${(stat.count / Math.max(...countryStats.map(s => s.count))) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-orange-400" />
                  Platform Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-orange-500/10 rounded-lg">
                      <div className="text-2xl font-bold text-white">{totalUsers}</div>
                      <div className="text-orange-200 text-sm">Total Users</div>
                    </div>
                    <div className="text-center p-4 bg-orange-500/10 rounded-lg">
                      <div className="text-2xl font-bold text-white">{totalLogs}</div>
                      <div className="text-orange-200 text-sm">Total Activities</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-orange-500/10 rounded-lg">
                      <div className="text-2xl font-bold text-white">{adminUsers}</div>
                      <div className="text-orange-200 text-sm">Admin Users</div>
                    </div>
                    <div className="text-center p-4 bg-orange-500/10 rounded-lg">
                      <div className="text-2xl font-bold text-white">{activeCountries}</div>
                      <div className="text-orange-200 text-sm">Countries</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
