import * as React from 'react'
import { memo, Fragment, useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, ScrollView } from '@tarojs/components'
import { AtAvatar } from 'taro-ui'
import { SectionItem } from '../../../../components'
import { isValidArray, formatDate, calNum } from '../../../../utils'
import { dateFormatToMin } from '../../../../constant'
import { ParticipantItem, InvitationStatus } from '../../type'
import { UserInfo } from '../../../../typings'
import dayjs from 'dayjs'

export interface ParticipantsViewProps {
  participants: ParticipantItem[]
  status: InvitationStatus // 状态
  hideEditbtn?: boolean // 不展示编辑按钮
  showEditTime?: (item: ParticipantItem) => void // 编辑时间
  totalFee: number // 总费用
  adminUsers: string[] // 管理员集合
  addAdminUsers?: (item: ParticipantItem) => void // 添加管理员
}

interface ParticipantView extends ParticipantItem {
  duration: number // 时长
}

// 活动参与人
const ParticipantsView: React.FC<ParticipantsViewProps> = ({
  participants = [],
  showEditTime = () => console.log(1),
  status,
  hideEditbtn = false,
  totalFee = 0,
  adminUsers = [],
  addAdminUsers = () => console.log(1),
}) => {
  const [viewMode, setViewMode] = useState<'detail' | 'list'>('detail')
  const [particapantList, setParticapantList] = useState<ParticipantView[]>([])
  const [totalTime, setTotalTime] = useState(0)
  const userInfo: UserInfo = Taro.getStorageSync('userInfo')
  // 处理时间及占比
  useEffect(() => {
    let startTimeArr: string[] = []
    let endTimeArr: string[] = []
    let newList = participants.map(({ startTime, endTime, ...val }) => {
      // 处理起始时间
      let newStartTime = startTime
      if (newStartTime) {
        newStartTime = formatDate(dayjs(`${formatDate(dayjs())} ${startTime}`), dateFormatToMin)
      }
      let newEndTime = endTime
      if (newEndTime) {
        newEndTime = formatDate(dayjs(`${formatDate(dayjs())} ${endTime}`), dateFormatToMin)
        // 若起始时间都存在 判断结束时间是否为第二天
        if (newStartTime && dayjs(newEndTime).isBefore(dayjs(newStartTime))) {
          newEndTime = formatDate(dayjs(newEndTime).add(1, 'd'), dateFormatToMin)
        }
      }
      startTimeArr.push(newStartTime)
      endTimeArr.push(newEndTime)
      // 起始时间都存在时计算时间差
      let timeDuration = newEndTime && newStartTime ? dayjs(newEndTime).diff(dayjs(newStartTime), 'm') : 0
      return {
        startTime: newStartTime,
        endTime: newEndTime,
        duration: timeDuration,
        ...val,
      }
    })
    // 计算总时间
    let timeSum = 0
    newList.forEach(x => {
      timeSum += x.duration
    })
    setTotalTime(timeSum)
    setParticapantList(newList)
  }, [participants])

  useEffect(() => {
    if (status === 'FINISHED') {
      setViewMode('list')
    }
  }, [status])

  // 返回占比
  const returnPercent = (duration: number) => {
    if (totalTime && totalTime > 0) {
      return duration / totalTime
    } else {
      return 0
    }
  }

  // 返回时长与占比文字
  const returnDurationAndPercent = (duration: number) => {
    // console.log(duration, 'item?.duration')
    if (totalTime && totalTime > 0) {
      // console.log((duration / totalTime) * 100)
      return `${duration}分钟/${calNum(returnPercent(duration) * 100)}%`
    } else {
      return `${duration}分钟/ 0%`
    }
  }

  // 返回单人费用
  const returnsingleFee = (duration: number) => {
    return Math.round(totalFee * returnPercent(duration))
  }

  // 返回最大宽度（默认390rpx
  const returnMaxWidthStyle = () => {
    if (hideEditbtn || status !== 'OPENING') {
      return { maxWidth: '500rpx' }
    } else if (adminUsers.includes(userInfo.userOpenId)) {
      return { maxWidth: '300rpx' }
    }
  }

  const showAuthModal = (item: ParticipantItem) => {
    // 确认取消弹窗
    Taro.showModal({
      content: `确认授予${item.name}管理员权限吗？授予后${item.name}可取消、结束活动及编辑每个参与者的起始/结束时间`,
      success: res => {
        if (res.confirm) {
          addAdminUsers(item)
        }
      },
    })
  }

  const changeViewMode = () => {
    setViewMode(viewMode === 'detail' ? 'list' : 'detail')
  }

  return (
    <View style={{ marginTop: '1px' }}>
      <View className="detail-card">
        <View className="title">
          参与人员
          <View className="right-btn" onClick={changeViewMode}>
            切换视图
          </View>
        </View>
        {isValidArray(particapantList) && (
          <Fragment>
            <View className="divider" />
            {viewMode === 'detail' ? (
              particapantList.map((item, index) => (
                <View key={index}>
                  <View className="participant-info">
                    <View className="participant-header">
                      <View className="user-info">
                        <AtAvatar circle text="头" image={item?.avatarUrl} />
                        <Text style={returnMaxWidthStyle()}>{item?.name}</Text>
                      </View>
                      {/* 状态为进行中且发起人或当前参与人才可编辑自己的时间 */}
                      {!hideEditbtn &&
                        status === 'OPENING' &&
                        (item.userOpenId === userInfo.userOpenId || adminUsers.includes(userInfo.userOpenId)) && (
                          <View className="operate-btns">
                            {adminUsers.includes(userInfo.userOpenId) && !adminUsers.includes(item.userOpenId) && (
                              <View className="link-col edit-btn" onClick={() => showAuthModal(item)}>
                                授权
                              </View>
                            )}
                            <View className="link-col edit-btn" onClick={() => showEditTime(item)}>
                              编辑
                            </View>
                          </View>
                        )}
                    </View>
                    <SectionItem label="起始时间：" content={formatDate(item?.startTime, 'HH:mm')} />
                    <SectionItem label="结束时间：" content={formatDate(item?.endTime, 'HH:mm')} />
                    <SectionItem label="时长/占比：" content={returnDurationAndPercent(item?.duration)} />
                    {totalFee ? <SectionItem label="费用" content={returnsingleFee(item?.duration)} /> : null}
                  </View>
                  {particapantList.length - 1 > index && <View className="divider" />}
                </View>
              ))
            ) : (
              <ScrollView scrollY scrollX className="participant-info-table">
                <View className="tr">
                  <Text className="th">姓名</Text>
                  <Text className="th">费用</Text>
                  <Text className="th">时间</Text>
                  <Text className="th">时长/占比</Text>
                </View>
                {particapantList.map((item, index) => {
                  return (
                    <View className="tr" key={index}>
                      <Text className="td" user-select>
                        {item?.name}
                      </Text>
                      <Text className="td" user-select>
                        {returnsingleFee(item?.duration)}
                      </Text>
                      <Text className="td" user-select>
                        {formatDate(item?.startTime, 'HH:mm')}~{formatDate(item?.endTime, 'HH:mm')}
                      </Text>
                      <Text className="td" user-select>
                        {returnDurationAndPercent(item?.duration)}
                      </Text>
                    </View>
                  )
                })}
              </ScrollView>
            )}
          </Fragment>
        )}
      </View>
    </View>
  )
}

export default memo(ParticipantsView)
